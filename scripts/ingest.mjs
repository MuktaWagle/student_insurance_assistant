import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
await mkdir('policy/generated', { recursive: true });
const pages = [],
  manifest = [];
for (const file of (await readdir('si-docs')).filter((f) => f.endsWith('.pdf')).sort()) {
  const data = await readFile(`si-docs/${file}`),
    hash = createHash('sha256').update(data).digest('hex');
  const pdf = await getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise;
  const sourceId = file.replace('.pdf', '');
  manifest.push({
    sourceId,
    file,
    hash,
    pages: pdf.numPages,
    effectiveStart: file.startsWith('Factsheet') ? '2026-08-01' : null,
    effectiveEnd: file.startsWith('Factsheet') ? '2027-07-31' : null,
    reviewStatus: 'extracted; curated administrative rules reviewed separately',
  });
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent();
    const text = content.items
      .map((i) => ('str' in i ? i.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length < 30) throw Error(`Unreadable page: ${file} ${page}`);
    pages.push({ id: `${sourceId}:${page}`, sourceId, page, text, hash });
  }
}
await writeFile('policy/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile('policy/generated/pages.json', JSON.stringify(pages, null, 2) + '\n');
console.log(`Indexed ${pages.length} pages from ${manifest.length} PDFs`);
