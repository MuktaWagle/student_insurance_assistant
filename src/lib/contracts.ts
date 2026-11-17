import { z } from 'zod';

export const profileSchema = z.object({
  university: z.literal('National University of Singapore'),
  year: z.coerce.number().int().min(1960).max(2100),
  level: z.enum(['undergraduate', 'graduate', 'unknown']),
  residency: z.enum(['local', 'international', 'unknown']),
  attendance: z.enum(['full-time', 'part-time', 'unknown']),
  status: z.enum(['active', 'leave', 'other', 'unknown']),
  fees: z.enum(['paid', 'unpaid', 'unknown']),
});

export const requestSchema = z.object({
  mode: z.enum(['care', 'claim']),
  profile: profileSchema,
  concern: z.string().trim().min(3).max(3000),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s)
    .or(z.literal('')),
  setting: z.enum(['unknown', 'specialist', 'hospital', 'accident', 'uhc']),
  log: z.enum(['yes', 'no', 'unknown']),
  consent: z.literal(true),
});

export type GuidanceRequest = z.infer<typeof requestSchema>;

export const citationSchema = z.object({
  sourceId: z.string().max(150),
  page: z.number().int().positive(),
  quote: z.string().min(15).max(1200),
});

export const answerSchema = z
  .object({
    status: z.enum(['answered', 'needs_information', 'insufficient_evidence']),
    items: z
      .array(
        z.object({
          section: z.enum(['overview', 'care', 'next_steps', 'documents']),
          title: z.string().min(1).max(160),
          text: z.string().min(1).max(2000),
          requirement: z.enum(['required', 'conditional', 'not_applicable']),
          condition: z.string().max(500),
          citations: z.array(citationSchema).min(1).max(6),
        }),
      )
      .max(20),
    questions: z.array(z.string().min(1).max(400)).max(6),
    limitations: z.array(z.string().min(1).max(600)).max(8),
  })
  .superRefine((answer, ctx) => {
    if (answer.status === 'answered' && !answer.items.length)
      ctx.addIssue({ code: 'custom', message: 'Answered results require cited content' });
    if (answer.status === 'needs_information' && !answer.questions.length)
      ctx.addIssue({ code: 'custom', message: 'Clarification requires a question' });
    answer.items.forEach((item, index) => {
      if (item.requirement === 'conditional' && !item.condition.trim())
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'condition'],
          message: 'Conditional documents need a condition',
        });
    });
  });
  
export type GeneratedAnswer = z.infer<typeof answerSchema>;
export type AnswerItem = GeneratedAnswer['items'][number] & { id: string };
export type Result = {
  status: string;
  message: string;
  limitations: string[];
  questions?: string[];
  items: AnswerItem[];
  engine: 'gemini' | 'reference' | 'safety';
};
