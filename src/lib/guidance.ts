import { classifyProviderError } from './provider-errors';
import { ModelResponseError } from './model-response';
import { GuidanceRequest, Result, answerSchema } from './contracts';
import { preflight } from './policy';
import { validateCitations } from './grounding';

function failure(status: string, message: string): Result {
  return { status, message, items: [], engine: 'gemini', limitations: [] };
}

function providerFailure(error: unknown): Result {
  if (error instanceof ModelResponseError) {
    const messages = {
      model_truncated:
        'Gemini exhausted its combined generation budget before completing the answer. The server log studentcare.gemini_truncated shows reasoning and answer token counts. Increase GEMINI_MAX_OUTPUT_TOKENS within your model’s supported limit if this persists.',
      model_blocked:
        'Gemini blocked this response. No guidance was returned. Try describing only the administrative claim process you need.',
      model_empty:
        'Gemini returned no answer text. Please retry or check the configured model’s structured-output support.',
    };
    return failure(error.kind, messages[error.kind]);
  }

  const diagnostic = classifyProviderError(error);
  const code = diagnostic.httpStatus;
  if (diagnostic.reason) {
    const reasons = {
      invalid_key: [
        'provider_auth_error',
        'Gemini rejected the API key as invalid or expired. Replace GEMINI_API_KEY in .env.local with a valid Gemini API key and restart the server.',
      ],
      schema_rejected: [
        'provider_schema_error',
        'Gemini rejected the structured-output schema or its support on this model. The response schema or model configuration needs adjustment.',
      ],
      input_limit: [
        'provider_context_limit',
        'The full PDF context exceeds this model’s input limit. Choose a model with a larger context window.',
      ],
      output_limit: [
        'provider_output_limit',
        'Gemini rejected the configured output-token budget. Adjust the budget or choose a compatible model.',
      ],
      region_unsupported: [
        'provider_region_error',
        'Gemini reports that this request location is unsupported. Check API availability for the server location.',
      ],
      model_parameter: [
        'provider_model_error',
        'Gemini rejected the model or a model-specific parameter. Check GEMINI_MODEL and its supported configuration.',
      ],
    };
    const [status, message] = reasons[diagnostic.reason];
    return failure(status, message);
  }
  if (diagnostic.kind === 'timeout')
    return failure(
      'provider_timeout',
      'Gemini exceeded the request time limit while processing the full policy documents. Try again or increase GEMINI_TIMEOUT_MS on the server (up to 120000 ms).',
    );
  if (diagnostic.kind === 'network')
    return failure(
      'provider_network_error',
      'The server could not connect to Gemini. Check the server network, DNS and proxy settings before retrying.',
    );
  if (code && code >= 500)
    return failure(
      'provider_server_error',
      'Gemini returned a server error. Please wait and try again; repeated failures may require checking the provider service status.',
    );
  if (code === 401 || code === 403)
    return failure(
      'provider_auth_error',
      'Gemini could not authenticate this request. Check the server API key and its permissions.',
    );
  if (code === 404)
    return failure(
      'provider_model_error',
      'The configured Gemini model is unavailable. Check GEMINI_MODEL and model access for this API key.',
    );
  if (code === 429)
    return failure(
      'provider_rate_limit',
      'Gemini quota or rate limit was reached. Please wait and try again, or check the API project quota.',
    );
  if (code === 400)
    return failure(
      'provider_request_error',
      'Gemini returned HTTP 400 without a recognized rejection category. The status alone cannot distinguish key, schema, model or parameter problems. Check the safe server diagnostics.',
    );
  return failure(
    'provider_unavailable',
    'Gemini could not complete the request. It may have timed out or encountered a network or service error. Please try again.',
  );
}

export async function guide(
  input: GuidanceRequest,
  select?: (input: GuidanceRequest) => Promise<unknown>,
): Promise<Result> {
  const early = preflight(input);
  if (early) return early;
  if (!select)
    return {
      status: 'needs_configuration',
      items: [],
      engine: 'reference',
      limitations: [],
      message:
        'Gemini is not configured. Set GEMINI_API_KEY and GEMINI_MODEL on the server to receive guidance.',
    };
  let response: unknown;
  try {
    response = await select(input);
  } catch (error) {
    return providerFailure(error);
  }
  try {
    if (typeof response === 'string')
      response = JSON.parse(
        response
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, ''),
      );
    const answer = answerSchema.parse(response);
    if (!validateCitations(answer))
      return failure(
        'evidence_error',
        'A cited passage could not be found on its reference page. Please retry; this answer has not been displayed.',
      );
    return {
      status: answer.status,
      message:
        answer.status === 'answered'
          ? 'Guidance for your situation'
          : answer.status === 'needs_information'
            ? 'A few details would help'
            : 'The supplied references do not establish a complete answer.',
      engine: 'gemini',
      items: answer.items.map((item, index) => ({ ...item, id: `answer-${index}` })),
      questions: answer.questions,
      limitations: [
        'AI-written administrative guidance. Citations are checked against the references, but this does not guarantee that every interpretation is correct. Confirm eligibility and claim decisions with NUS or the insurer.',
        ...answer.limitations,
      ],
    };
  } catch {
    return failure(
      'invalid_model_response',
      'Gemini returned an unreadable answer. Please try again.',
    );
  }
}
