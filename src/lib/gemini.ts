import 'server-only';
import { outputTokenBudget, thinkingConfig } from './generation-config';
import { classifyProviderError, providerTimeoutMs } from './provider-errors';
import { responseText } from './model-response';
import { GoogleGenAI } from '@google/genai';
import { GuidanceRequest } from './contracts';
import { buildContext, systemInstruction, responseSchema } from './grounding';

export async function generateGuidance(input: GuidanceRequest) {
  const timeoutMs = providerTimeoutMs();
  const model = process.env.GEMINI_MODEL!;
  const maxOutputTokens = outputTokenBudget();

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    // Do not set retryOptions here: this SDK version discards HTTP status codes
    // in its retry wrapper, even with attempts: 1. Default unary fetch preserves ApiError.
    httpOptions: { timeout: timeoutMs },
  });

  const started = Date.now();
  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: JSON.stringify({
        request: input,
        referenceContext: buildContext(),
        answerFormat: responseSchema,
      }),
      config: {
        systemInstruction,
        // JSON mode avoids provider-side schema compilation failures. The full answer
        // contract is supplied as context and still validated locally before rendering.
        responseMimeType: 'application/json',
        maxOutputTokens,
        thinkingConfig: thinkingConfig(model),
      },
    });
  } catch (error) {
    // Operational metadata only: no prompts, keys, provider bodies or raw messages.
    console.warn('studentcare.gemini_failure', {
      ...classifyProviderError(error),
      elapsedMs: Date.now() - started,
      timeoutMs,
    });
    throw error;
  }
  
  if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    console.warn('studentcare.gemini_truncated', {
      maxOutputTokens,
      thoughtsTokens: response.usageMetadata?.thoughtsTokenCount,
      answerTokens: response.usageMetadata?.candidatesTokenCount,
      answerCharacters: response.text?.length ?? 0,
      elapsedMs: Date.now() - started,
    });
  }
  return responseText(response);
}
