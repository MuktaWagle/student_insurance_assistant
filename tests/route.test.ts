import { it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/guidance/route';
const body = {
  mode: 'care',
  profile: {
    university: 'National University of Singapore',
    year: 2026,
    level: 'unknown',
    residency: 'unknown',
    attendance: 'unknown',
    status: 'unknown',
    fees: 'unknown',
  },
  concern: 'I need emergency help',
  date: '',
  setting: 'unknown',
  log: 'unknown',
  consent: true,
};
function request(data: unknown, origin = 'http://127.0.0.1:3000') {
  return new NextRequest('http://localhost:3000/api/guidance', {
    method: 'POST',
    headers: { origin, host: '127.0.0.1:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
it('accepts a legitimate local origin despite internal hostname', async () => {
  const response = await POST(request(body));
  expect(response.status).toBe(200);
  expect((await response.json()).engine).toBe('safety');
});
it('rejects foreign origins', async () =>
  expect((await POST(request(body, 'https://other.example'))).status).toBe(403));
it('rejects invalid profiles', async () => expect((await POST(request({}))).status).toBe(400));
it('rejects oversized bodies', async () =>
  expect((await POST(request({ ...body, concern: 'a'.repeat(13000) }))).status).toBe(413));
