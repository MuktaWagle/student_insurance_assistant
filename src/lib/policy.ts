import { GuidanceRequest, Result } from './contracts';
export function preflight(input: GuidanceRequest): Result | null {
  const base = { items: [], engine: 'reference' as const, limitations: [] };
  if (
    /\b(emergency|help me now|immediate help|urgent help|suicid\w*|kill myself)\b/i.test(
      input.concern,
    )
  )
    return {
      ...base,
      status: 'help_now',
      engine: 'safety',
      message:
        'If you need immediate help, contact local emergency services or seek immediate professional help. Do not wait for this assistant. It cannot assess symptoms or urgency.',
    };
  if (
    /\b(diagnos\w*|what disease|what medication|what medicine|dosage|should i take|am i safe)\b/i.test(
      input.concern,
    )
  )
    return {
      ...base,
      status: 'needs_information',
      message:
        'I can help with care access and insurance paperwork, but cannot assess symptoms, diagnose, or recommend treatment. Please ask a healthcare professional. Tell me which administrative process you need help with.',
    };
  if (input.date && (input.date < '2026-08-01' || input.date > '2027-07-31'))
    return {
      ...base,
      status: 'insufficient_evidence',
      message:
        'The supplied factsheets cover 1 August 2026 to 31 July 2027. I cannot establish the policy for this date.',
    };
  return null;
}
