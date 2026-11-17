import { afterEach, it, expect, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { generateGuidance } from '../src/lib/gemini';
import { guide } from '../src/lib/guidance';
import { input } from './fixtures';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
function mockHttp(status: number, statusText: string) {
  vi.stubEnv('GEMINI_API_KEY', 'fictional-test-key');
  vi.stubEnv('GEMINI_MODEL', 'test-model');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: { code: status, message: 'private provider error details', status: statusText },
        }),
        { status, statusText, headers: { 'content-type': 'application/json' } },
      ),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
it('reproduces SDK loss of status when retryOptions is supplied', async () => {
  mockHttp(400, 'Bad Request');
  const ai = new GoogleGenAI({
    apiKey: 'fictional-test-key',
    httpOptions: { retryOptions: { attempts: 1 } },
  });
  try {
    await ai.models.generateContent({ model: 'test-model', contents: 'fictional input' });
    throw Error('Expected error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('Non-retryable exception');
    expect((error as { status?: number }).status).toBeUndefined();
  }
});
for (const [code, text, status] of [
  [400, 'Bad Request', 'provider_request_error'],
  [401, 'Unauthorized', 'provider_auth_error'],
  [403, 'Forbidden', 'provider_auth_error'],
  [404, 'Not Found', 'provider_model_error'],
  [429, 'Too Many Requests', 'provider_rate_limit'],
  [503, 'Service Unavailable', 'provider_server_error'],
] as const)
  it(`preserves actual SDK HTTP ${code} through the application`, async () => {
    const fetch = mockHttp(code, text);
    const result = await guide(input, generateGuidance);
    expect(result.status).toBe(status);
    expect(fetch).toHaveBeenCalledOnce();
    const log = vi.mocked(console.warn).mock.calls[0];
    expect(log[1]).toMatchObject({ kind: 'http', httpStatus: code });
    expect(JSON.stringify(log)).not.toContain('fictional-test-key');
    expect(JSON.stringify(log)).not.toContain('private provider error details');
    expect(JSON.stringify(result)).not.toContain('private provider error details');
  });

it('sends JSON mode with a prompt contract rather than a provider-enforced schema', async () => {
  const fetch = mockHttp(400, 'Bad Request');
  await guide(input, generateGuidance);
  const options = fetch.mock.calls[0] as unknown as [unknown, { body: string }];
  const body = JSON.parse(options[1].body);
  expect(body.generationConfig.responseMimeType).toBe('application/json');
  expect(body.generationConfig.responseJsonSchema).toBeUndefined();
  expect(body.generationConfig.responseSchema).toBeUndefined();
  const content = JSON.parse(body.contents[0].parts[0].text);
  expect(content.answerFormat.required).toContain('items');
  expect(content.referenceContext.pages).toHaveLength(32);
});

it('sets a larger output budget and low thinking for newer model families', async () => {
  const fetch = mockHttp(400, 'Bad Request');
  vi.stubEnv('GEMINI_MODEL', 'gemini-4-hydrogen');
  vi.stubEnv('GEMINI_MAX_OUTPUT_TOKENS', '32768');
  await guide(input, generateGuidance);
  const options = fetch.mock.calls[0] as unknown as [unknown, { body: string }];
  const config = JSON.parse(options[1].body).generationConfig;
  expect(config.maxOutputTokens).toBe(32768);
  expect(config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
});

it('logs token counts but no response content on truncation', async () => {
  mockHttp(400, 'Bad Request');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'MAX_TOKENS',
                content: { role: 'model', parts: [{ text: 'private incomplete answer' }] },
              },
            ],
            usageMetadata: { thoughtsTokenCount: 8100, candidatesTokenCount: 92 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    ),
  );
  const result = await guide(input, generateGuidance);
  expect(result.status).toBe('model_truncated');
  const log = vi
    .mocked(console.warn)
    .mock.calls.find((call) => call[0] === 'studentcare.gemini_truncated');
  expect(log?.[1]).toMatchObject({ thoughtsTokens: 8100, answerTokens: 92, answerCharacters: 25 });
  expect(JSON.stringify(log)).not.toContain('private incomplete answer');
});
