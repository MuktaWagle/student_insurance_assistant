import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:3000');
await page.getByRole('heading', { name: 'How can we help?' }).waitFor();
// Verify the loopback origin can upgrade the development hot-reload connection.
await page.evaluate(
  () =>
    new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://${location.host}/_next/hmr?id=browser-check`);
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('HMR handshake timed out'));
      }, 5000);
      socket.onopen = () => {
        clearTimeout(timeout);
        socket.close();
        resolve(true);
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        socket.close();
        reject(new Error('HMR handshake failed'));
      };
    }),
);
await mkdir('tmp/review', { recursive: true });
await page.screenshot({ path: 'tmp/review/desktop.png', fullPage: true });
await page.getByLabel('Study level', { exact: true }).selectOption('undergraduate');
await page.getByLabel('Residency', { exact: true }).selectOption('local');
await page.getByLabel('Attendance', { exact: true }).selectOption('full-time');
await page.getByText('Enrolment & fee details').click();
await page.getByLabel('Student status', { exact: true }).selectOption('active');
await page.getByLabel('Health Service Fees', { exact: true }).selectOption('paid');
await page.getByRole('button', { name: 'Help with claim' }).click();
await page.getByLabel('Tell us about your claim').fill('I need emergency help');
await page.getByLabel('Care or claim type', { exact: true }).selectOption('specialist');
await page.getByLabel('Treatment / incident date', { exact: true }).fill('2026-11-16');
await page.getByRole('checkbox').check();
await page.getByRole('button', { name: 'Find my next steps' }).click();
await page.getByText('Immediate help', { exact: true }).waitFor();
await page.getByRole('button', { name: 'Start over' }).click();
if (await page.getByText('Immediate help', { exact: true }).count()) throw Error('Reset failed');
// Exercise the model-written response UI without calling a paid provider.
await page.route('**/api/guidance', (route) =>
  route.fulfill({
    json: {
      status: 'needs_information',
      engine: 'gemini',
      message: 'A few details would help',
      items: [
        {
          id: 'answer-0',
          section: 'documents',
          title: 'Prepare your invoice',
          text: 'Keep the invoice from your specialist visit with the treatment details.',
          requirement: 'conditional',
          condition: 'If you are submitting a specialist claim',
          citations: [
            {
              sourceId: 'Factsheet_outpatientspecialistinsurance',
              page: 2,
              quote: 'Medical Invoices (with details of treatment)',
            },
          ],
        },
      ],
      questions: ['Do you have a referral letter?'],
      limitations: ['AI-written administrative guidance.'],
    },
  }),
);
await page
  .getByLabel('What would you like help with?')
  .fill('Fictional specialist visit; help with paperwork');
await page.getByRole('checkbox').check();
await page.getByRole('button', { name: 'Find my next steps' }).click();
await page.getByRole('heading', { name: 'Documents to prepare' }).waitFor();
if (await page.getByText('Do you have a referral letter?', { exact: true }).count())
  throw Error('API questions should not be displayed');
if (await page.getByRole('heading', { name: 'A few details to clarify' }).count())
  throw Error('Clarification section should be hidden');
for (const id of ['fees-hint', 'care-type-hint']) {
  await page.locator(`[aria-describedby="${id}"]`).focus();
  if (!(await page.locator(`#${id}`).isVisible()))
    throw Error('Tooltip must be visible on keyboard focus');
}
await page.locator('textarea').focus();
await page.getByRole('checkbox', { name: 'Prepare your invoice' }).check();
await page.getByText('Source · Factsheet outpatientspecialistinsurance · p. 2').click();
await page.screenshot({ path: 'tmp/review/generated-answer.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'tmp/review/mobile.png', fullPage: true });
if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
  throw Error('Horizontal overflow');
const pdf = await page.request.get('http://127.0.0.1:3000/sources/si-claims');
if (pdf.status() !== 200 || !pdf.headers()['content-type'].includes('pdf'))
  throw Error('PDF route');
const denied = await page.request.post('http://127.0.0.1:3000/api/guidance', {
  headers: { Origin: 'https://untrusted.example' },
  data: {},
});
if (denied.status() !== 403) throw Error('Origin protection');
await page.unroute('**/api/guidance');
await page.reload();
if ((await page.getByLabel('Study level', { exact: true }).inputValue()) !== 'unknown')
  throw Error('Memory lifecycle');
if (errors.length) throw Error(errors.join('\n'));
console.log(
  'Browser checks passed: desktop/mobile, profile, help-now API, reset, memory lifecycle, PDF and origin protection.',
);
await browser.close();
