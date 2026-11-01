import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const ENDPOINT = 'tgcloud/endpoints/probe.js';
const alvos = process.argv.slice(2).map((a) => (a.includes('://') ? a : 'https://t.me/' + a.replace(/^@/, ''))).filter(Boolean);

fs.mkdirSync('tgcloud/endpoints', { recursive: true });
fs.writeFileSync(ENDPOINT, `import { fetch } from 'sdk';

const ALVOS = ${JSON.stringify(alvos)};

export default async function () {
  for (const u of ALVOS) {
    let res;
    let html;
    try {
      res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      html = await res.text();
    } catch (e) {
      console.log('=== ' + u + ' FALHOU: ' + e.name + ': ' + e.message);
      continue;
    }
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
  fs.rmSync('tgcloud/endpoints', { recursive: true, force: true });
}
