import { NextRequest, NextResponse } from 'next/server';
import { requestSchema } from '../../../lib/contracts';
import { guide } from '../../../lib/guidance';
import { generateGuidance } from '../../../lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 150;

const buckets = new Map<string, { count: number; until: number }>();

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  // origin check for security, rate limiting, and request size validation
  if (req.headers.get('origin') !== `${req.nextUrl.protocol}//${req.headers.get('host')}`)
    return reply({ error: 'Please submit from this app.' }, 403);
  
  const key = req.headers.get('x-forwarded-for')?.split(',')[0] || 'local';
  const now = Date.now();
  for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  const bucket = buckets.get(key) || { count: 0, until: now + 60000 };
  if (++bucket.count > 12)
    return reply({ error: 'Please wait a minute before trying again.' }, 429);
  
  if (buckets.size < 1000) buckets.set(key, bucket);
  try {
    if (Number(req.headers.get('content-length')) > 12000)
      return reply({ error: 'Please shorten your request.' }, 413);
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: 'A request is required.' }, 400);
    
    // validated for security, size, rate limit and json format
    let body = '';
    let bytes = 0;
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 12000) {
        await reader.cancel();
        return reply({ error: 'Please shorten your request.' }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const parsed = requestSchema.safeParse(JSON.parse(body));
    if (!parsed.success)
      return reply({ error: 'Please check your profile, date, concern, and consent.' }, 400);

    // all validations passed, now we can process the request
    return reply(
      await guide(
        parsed.data,
        process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL ? generateGuidance : undefined,
      ),
    );
  } catch {
    return reply({ error: 'Unable to process this request. Please try again.' }, 400);
  }
}
