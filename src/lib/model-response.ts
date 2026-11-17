// Keep provider output content and sensitive request data out of diagnostics.
export class ModelResponseError extends Error {
  constructor(public readonly kind: 'model_truncated' | 'model_blocked' | 'model_empty') {
    super(kind);
  }
}
export function responseText(response: {
  text?: string;
  candidates?: { finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}): string {
  const reason = response.candidates?.[0]?.finishReason;
  if (reason === 'MAX_TOKENS') throw new ModelResponseError('model_truncated');
  if (
    response.promptFeedback?.blockReason ||
    (reason && ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII'].includes(reason))
  )
    throw new ModelResponseError('model_blocked');
  if (!response.text?.trim()) throw new ModelResponseError('model_empty');
  return response.text;
}
