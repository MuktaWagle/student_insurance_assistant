import { it, expect } from 'vitest';
import { classifyProviderError, providerTimeoutMs } from '../src/lib/provider-errors';
import { guide } from '../src/lib/guidance';
import { input, answer } from './fixtures';
for (const [error, status] of [
  [
    Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }),
    'provider_timeout',
  ],
  [{ name: 'APIConnectionTimeoutError' }, 'provider_timeout'],
  [{ cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }, 'provider_timeout'],
  [{ status: 504 }, 'provider_timeout'],
  [{ statusCode: 503 }, 'provider_server_error'],
  [{ message: 'fetch failed', cause: { code: 'ENOTFOUND' } }, 'provider_network_error'],
  [{ cause: { status: 429 } }, 'provider_rate_limit'],
  [new Error('unexpected secret provider body'), 'provider_unavailable'],
] as const)
  it(`classifies error as ${status}`, async () => {
    const result = await guide(input, async () => {
      throw error;
    });
    expect(result.status).toBe(status);
    expect(JSON.stringify(result)).not.toContain('secret');
  });
it('bounds configurable timeout with a 60-second default', () => {
  expect(providerTimeoutMs('')).toBe(60000);
  expect(providerTimeoutMs('invalid')).toBe(60000);
  expect(providerTimeoutMs('120001')).toBe(60000);
  expect(providerTimeoutMs('90000')).toBe(90000);
});
it('handles cyclic causes safely', () => {
  const e: { cause?: unknown } = {};
  e.cause = e;
  expect(classifyProviderError(e).kind).toBe('unknown');
});
it('reported care concern is not rejected by preflight', async () => {
  const generate = async () => answer;
  const result = await guide(
    {
      ...input,
      mode: 'care',
      profile: { ...input.profile, residency: 'local' },
      concern: 'I have high fever',
      date: '2026-11-17',
      setting: 'unknown',
    },
    generate,
  );
  expect(result.status).toBe('answered');
});
for (const [message, reason, status] of [
  [
    '{"error":{"message":"API key not valid. Please pass a valid API key.","details":[{"reason":"API_KEY_INVALID"}]}}',
    'invalid_key',
    'provider_auth_error',
  ],
  ['API key expired. Please renew the API key.', 'invalid_key', 'provider_auth_error'],
  [
    'Invalid JSON payload received. Unknown name response_json_schema',
    'schema_rejected',
    'provider_schema_error',
  ],
  [
    'The input token count exceeds the maximum allowed input tokens',
    'input_limit',
    'provider_context_limit',
  ],
  ['max_output_tokens must be less than 1024', 'output_limit', 'provider_output_limit'],
  ['User location is not supported for the API use', 'region_unsupported', 'provider_region_error'],
] as const)
  it(`classifies HTTP 400 reason ${reason} without disclosing the body`, async () => {
    const error = { status: 400, message };
    expect(classifyProviderError(error)).toMatchObject({ httpStatus: 400, reason });
    const result = await guide(input, async () => {
      throw error;
    });
    expect(result.status).toBe(status);
    expect(JSON.stringify(classifyProviderError(error))).not.toContain(message);
  });
