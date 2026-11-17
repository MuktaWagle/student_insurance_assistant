import { GuidanceRequest } from '../src/lib/contracts';
import { buildContext } from '../src/lib/grounding';
export const input: GuidanceRequest = {
  mode: 'claim',
  profile: {
    university: 'National University of Singapore',
    year: 2026,
    level: 'graduate',
    residency: 'international',
    attendance: 'full-time',
    status: 'active',
    fees: 'paid',
  },
  concern: 'I visited ENT specialist',
  date: '2026-11-16',
  setting: 'specialist',
  log: 'unknown',
  consent: true,
};
const page = buildContext().pages.find(
  (p) => p.sourceId === 'Factsheet_outpatientspecialistinsurance' && p.page === 2,
)!;
export const answer = {
  status: 'answered' as const,
  items: [
    {
      section: 'documents' as const,
      title: 'Bring your specialist invoice',
      text: 'Keep the detailed invoice from your specialist visit for your claim.',
      requirement: 'required' as const,
      condition: '',
      citations: [
        {
          sourceId: page.sourceId,
          page: page.page,
          quote: page.text.slice(
            page.text.indexOf('Medical Invoices'),
            page.text.indexOf('Medical Invoices') + 60,
          ),
        },
      ],
    },
  ],
  questions: [],
  limitations: [],
};
