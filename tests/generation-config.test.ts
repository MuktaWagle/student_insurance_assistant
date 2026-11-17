import { it, expect } from 'vitest';
import { outputTokenBudget, thinkingConfig } from '../src/lib/generation-config';
it('defaults output budget to 16384 with bounded overrides', () => {
  for (const value of ['', undefined, 'nonsense', '0', '65537', '2048.5'])
    expect(outputTokenBudget(value)).toBe(16384);
  expect(outputTokenBudget('32768')).toBe(32768);
});
it('uses numeric thinking budget only for Gemini 2.5', () =>
  expect(thinkingConfig('gemini-2.5-pro')).toEqual({ thinkingBudget: 1024 }));
it('uses low thinking for Gemini 3 and 4', () => {
  for (const model of [
    'gemini-3-flash-preview',
    'models/gemini-3.1-pro-preview',
    'gemini-4-hydrogen',
  ])
    expect(thinkingConfig(model)).toEqual({ thinkingLevel: 'LOW' });
});
it('does not guess thinking support for unknown models', () =>
  expect(thinkingConfig('custom-model')).toBeUndefined());
