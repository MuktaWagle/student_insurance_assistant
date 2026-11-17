import { ThinkingLevel, type ThinkingConfig } from '@google/genai';
export function outputTokenBudget(value = process.env.GEMINI_MAX_OUTPUT_TOKENS): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 2048 && n <= 65536 ? n : 16384;
}
export function thinkingConfig(model: string): ThinkingConfig | undefined {
  const id = model.replace(/^models\//, '');
  // Numeric budgets are for 2.5; newer models use thinking levels instead.
  if (/^gemini-2\.5(?:-|$)/.test(id)) return { thinkingBudget: 1024 };
  if (/^gemini-[34](?:[.-]|$)/.test(id)) return { thinkingLevel: ThinkingLevel.LOW };
  // Do not assume an unknown model supports either thinking parameter.
  return undefined;
}
