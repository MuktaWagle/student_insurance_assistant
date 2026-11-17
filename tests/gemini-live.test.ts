import { it, expect } from 'vitest';
import { generateGuidance } from '../src/lib/gemini';
import { guide } from '../src/lib/guidance';
import { input } from './fixtures';
it.skipIf(process.env.STUDENTCARE_LIVE !== '1')(
  'opt-in single fictional full-context Gemini request',
  async () => {
    expect(Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL)).toBe(true);
    const result = await guide(
      {
        ...input,
        mode: 'care',
        setting: 'unknown',
        concern:
          'This is a fictional prototype test. Where can an active NUS graduate student access care, and what administrative documents should they keep for a possible claim?',
      },
      generateGuidance,
    );
    console.info('studentcare.live_diagnostic', {
      status: result.status,
      itemCount: result.items.length,
    });
    expect(['answered', 'needs_information', 'insufficient_evidence']).toContain(result.status);
  },
  130000,
);
