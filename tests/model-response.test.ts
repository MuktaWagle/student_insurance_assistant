import { it, expect } from 'vitest';
import { responseText, ModelResponseError } from '../src/lib/model-response';
import { guide } from '../src/lib/guidance';
import { input, answer } from './fixtures';
it('supports the reported ENT request with a valid selection', async () =>
  expect(
    (
      await guide(input, async () =>
        responseText({
          text: JSON.stringify(answer),
          candidates: [{ finishReason: 'STOP' }],
        }),
      )
    ).items,
  ).toHaveLength(1));
for (const [response, kind] of [
  [{ text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] }, 'model_truncated'],
  [{ text: '{"ruleIds": [', candidates: [{ finishReason: 'MAX_TOKENS' }] }, 'model_truncated'],
  [{ text: '', candidates: [{ finishReason: 'SAFETY' }] }, 'model_blocked'],
  [{ promptFeedback: { blockReason: 'SAFETY' } }, 'model_blocked'],
  [{ text: '' }, 'model_empty'],
] as const)
  it(`distinguishes ${JSON.stringify(response)} as ${kind}`, async () => {
    const result = await guide(input, async () =>
      responseText({
        ...response,
        candidates: 'candidates' in response ? [...response.candidates] : undefined,
      }),
    );
    expect(result.status).toBe(kind);
    expect(result.items).toEqual([]);
  });
it('uses a typed error with no provider body', () =>
  expect(new ModelResponseError('model_empty').message).toBe('model_empty'));
