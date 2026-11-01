import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const ENDPOINT = 'tgcloud/endpoints/probe.js';
const alvos = process.argv.slice(2).map((a) => a.replace(/^@/, '')).filter(Boolean);

fs.writeFileSync(ENDPOINT, `import { fetch } from 'sdk';

const ALVOS = ${JSON.stringify(alvos)};

export default async function () {
  for (const u of ALVOS) {
    const res = await fetch('https://t.me/' + u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    console.log('=== ' + u + ' status=' + res.status + ' bytes=' + html.length + ' content-type=' + res.headers.get('content-type'));
    for (const m of (html.match(/<meta[^>]+>/gi) || [])) console.log(m.slice(0, 400));
    for (const m of (html.match(/<div class="tgme_page_(?:title|description|extra|photo)[\\s\\S]{0,500}/g) || [])) console.log(m.replace(/\\s+/g, ' ').slice(0, 500));
  }
  return { ok: true };
}
`);

try {
  const r = spawnSync('npx', ['--no-install', 'tgcloud', 'run', 'endpoints/probe', '{}'], { stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} finally {
  fs.rmSync(ENDPOINT, { force: true });
}
