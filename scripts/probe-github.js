import { fetch } from 'sdk';
import { GH_DISPATCH_TOKEN } from '../lib/segredos.js';

async function sondar(rotulo, url, headers) {
  try {
    const res = await fetch(url, { headers });
    const corpo = await res.text();
    console.log(rotulo, 'status', res.status, 'corpo', corpo.slice(0, 200).replace(/\s+/g, ' '));
  } catch (e) {
    console.log(rotulo, 'FALHOU', e.name + ': ' + e.message);
  }
}

export default async function () {
  console.log('token injetado:', GH_DISPATCH_TOKEN ? 'sim, ' + GH_DISPATCH_TOKEN.length + ' caracteres' : 'não');
  const base = { 'User-Agent': 'infocard-bot', Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  await sondar('api.github.com sem token', 'https://api.github.com/zen', base);
  await sondar('workflow com token', 'https://api.github.com/repos/romastefale/infocard/actions/workflows/resolver.yml', { ...base, Authorization: 'Bearer ' + GH_DISPATCH_TOKEN });
  return { ok: true };
}
