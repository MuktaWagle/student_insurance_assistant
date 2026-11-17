import { describe, it, expect, vi } from 'vitest';
import { guide } from '../src/lib/guidance';
import { requestSchema, answerSchema } from '../src/lib/contracts';
import { buildContext, validateCitations } from '../src/lib/grounding';
import { preflight } from '../src/lib/policy';
import { input, answer } from './fixtures';
const page = buildContext().pages.find(
  (p) => p.sourceId === 'Factsheet_outpatientspecialistinsurance' && p.page === 2,
)!;
describe('Full-document grounding', () => {
  it('supplies every PDF and physical page with no category filter', () => {
    const c = buildContext();
    expect(c.manifest).toHaveLength(10);
    expect(c.pages).toHaveLength(32);
    for (const source of c.manifest)
      expect(c.pages.filter((p) => p.sourceId === source.sourceId)).toHaveLength(source.pages);
  });
  it('accepts original model wording rather than catalog IDs', async () => {
    const result = await guide(input, async () => answer);
    expect(result.items[0].text).toBe(answer.items[0].text);
    expect(result.status).toBe('answered');
  });
  it('accepts fenced JSON', async () =>
    expect(
      (await guide(input, async () => '```json\n' + JSON.stringify(answer) + '\n```')).items,
    ).toHaveLength(1));
  it('rejects legacy rule selection', async () =>
    expect((await guide(input, async () => ({ ruleIds: ['specialist-invoice'] }))).status).toBe(
      'invalid_model_response',
    ));
  it('requires citations on every policy item', () =>
    expect(
      answerSchema.safeParse({ ...answer, items: [{ ...answer.items[0], citations: [] }] }).success,
    ).toBe(false));
  it('checks quotes against the cited page', () =>
    expect(
      validateCitations({
        ...answer,
        items: [
          {
            ...answer.items[0],
            citations: [
              { sourceId: page.sourceId, page: 2, quote: 'fabricated policy support here' },
            ],
          },
        ],
      }),
    ).toBe(false));
  it('rejects invented source IDs and pages', async () => {
    for (const citation of [
      { sourceId: '../../secret', page: 1, quote: 'a fabricated quotation' },
      { sourceId: page.sourceId, page: 999, quote: answer.items[0].citations[0].quote },
    ])
      expect(
        (
          await guide(input, async () => ({
            ...answer,
            items: [{ ...answer.items[0], citations: [citation] }],
          }))
        ).status,
      ).toBe('evidence_error');
  });
  it('requires conditional document conditions', () =>
    expect(
      answerSchema.safeParse({
        ...answer,
        items: [{ ...answer.items[0], requirement: 'conditional' }],
      }).success,
    ).toBe(false));
  it('allows targeted model clarification with partial supported guidance', async () =>
    expect(
      (
        await guide(input, async () => ({
          ...answer,
          status: 'needs_information',
          questions: ['Do you have a referral letter?'],
        }))
      ).questions,
    ).toEqual(['Do you have a referral letter?']));
  it('allows unknown fields to reach the model without inventing applicability', async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({
        ...answer,
        status: 'needs_information',
        questions: ['Has the fee been paid?'],
      });
    await guide(
      { ...input, setting: 'unknown', profile: { ...input.profile, fees: 'unknown' } },
      generate,
    );
    expect(generate).toHaveBeenCalledOnce();
  });
  it('does not claim an answered result without cited content', () =>
    expect(answerSchema.safeParse({ ...answer, items: [] }).success).toBe(false));
  it('does not insert generic cards or fallback content', async () =>
    expect((await guide(input)).items).toEqual([]));
});
describe('Boundaries and errors', () => {
  it('rejects oversized or unconsented inputs', () => {
    expect(requestSchema.safeParse({ ...input, concern: 'a'.repeat(3001) }).success).toBe(false);
    expect(requestSchema.safeParse({ ...input, consent: false }).success).toBe(false);
  });
  it('rejects nonexistent dates', () =>
    expect(requestSchema.safeParse({ ...input, date: '2026-02-31' }).success).toBe(false));
  it('keeps policy-period abstention', () =>
    expect(preflight({ ...input, date: '2028-01-01' })?.status).toBe('insufficient_evidence'));
  it('handles immediate help without model', async () => {
    const generate = vi.fn();
    expect((await guide({ ...input, concern: 'I need emergency help' }, generate)).engine).toBe(
      'safety',
    );
    expect(generate).not.toHaveBeenCalled();
  });
  it('does not diagnose', () =>
    expect(preflight({ ...input, concern: 'Please diagnose me' })?.status).toBe(
      'needs_information',
    ));
  it('distinguishes malformed JSON', async () =>
    expect((await guide(input, async () => 'not json')).status).toBe('invalid_model_response'));
  it('does not expose provider error details', async () => {
    const result = await guide(input, async () => {
      throw Error('secret');
    });
    expect(result.status).toBe('provider_unavailable');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
  for (const [code, status] of [
    [401, 'provider_auth_error'],
    [404, 'provider_model_error'],
    [429, 'provider_rate_limit'],
    [400, 'provider_request_error'],
  ] as const)
    it(`classifies ${code}`, async () =>
      expect(
        (
          await guide(input, async () => {
            throw { status: code };
          })
        ).status,
      ).toBe(status));
});
