import { readFile } from 'node:fs/promises';
import path from 'node:path';
import manifest from '../../../../policy/manifest.json';
export async function GET(_: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const source = manifest.find((s) => s.sourceId === sourceId);
  if (!source) return new Response('Not found', { status: 404 });
  const data = await readFile(path.join(process.cwd(), 'si-docs', source.file));
  return new Response(data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
