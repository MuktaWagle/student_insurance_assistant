export type RejectionReason =
  | 'invalid_key'
  | 'schema_rejected'
  | 'input_limit'
  | 'output_limit'
  | 'region_unsupported'
  | 'model_parameter';
function rejectionReason(message: unknown): RejectionReason | undefined {
  if (typeof message !== 'string') return undefined;
  // Categorize privately; provider bodies may echo sensitive data and must not be logged.
  if (/API_KEY_INVALID|API_KEY_EXPIRED|API key not valid|api key.*expired/i.test(message))
    return 'invalid_key';
  if (/location.*not supported|country.*not supported|region.*not supported/i.test(message))
    return 'region_unsupported';
  if (/input.*token.*(exceed|limit)|exceed.*input.*token|context.*(length|limit)/i.test(message))
    return 'input_limit';
  if (/max_output_tokens|maxOutputTokens|output token.*(exceed|limit)/i.test(message))
    return 'output_limit';
  if (
    /response_json_schema|responseJsonSchema|response_schema|responseSchema|json schema|schema.*(complex|invalid|unsupported)|structured.*(not supported|unsupported)/i.test(
      message,
    )
  )
    return 'schema_rejected';
  if (/model.*(invalid|not supported)|invalid model|unsupported.*parameter/i.test(message))
    return 'model_parameter';
  return undefined;
}
export type ProviderFailureKind = 'timeout' | 'network' | 'http' | 'unknown';
export function classifyProviderError(error: unknown): {
  kind: ProviderFailureKind;
  httpStatus?: number;
  reason?: RejectionReason;
} {
  let current = error;
  const seen = new Set<unknown>();
  let timeout = false,
    network = false;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === 'object' && !seen.has(current);
    depth++
  ) {
    seen.add(current);
    const e = current as Record<string, unknown>;
    const status = Number(e.status ?? e.statusCode);
    if (Number.isInteger(status) && status >= 400 && status <= 599)
      return {
        kind: status === 408 || status === 504 ? 'timeout' : 'http',
        httpStatus: status,
        ...(status === 400 && rejectionReason(e.message)
          ? { reason: rejectionReason(e.message) }
          : {}),
      };
    // Inspect strings only to categorize; never log or return their contents.
    const marker = [e.name, e.code, e.message].filter((v) => typeof v === 'string').join(' ');
    timeout ||= /timeout|timed\s*out|aborterror|aborted|deadline_exceeded/i.test(marker);
    network ||=
      /fetch failed|econnreset|enotfound|eai_again|econnrefused|enetwork|connectionerror|network/i.test(
        marker,
      );
    current = e.cause;
  }
  return { kind: timeout ? 'timeout' : network ? 'network' : 'unknown' };
}
export function providerTimeoutMs(value = process.env.GEMINI_TIMEOUT_MS): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1000 && parsed <= 120000 ? parsed : 60000;
}
