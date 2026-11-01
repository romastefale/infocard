import { fetch } from 'sdk';
import { GH_DISPATCH_TOKEN } from './segredos.js';

const URL_DISPARO = 'https://api.github.com/repos/romastefale/infocard/actions/workflows/resolver.yml/dispatches';

export async function dispararBusca(alvo, chatId) {
  if (!GH_DISPATCH_TOKEN) {
    const erro = new Error('GH_DISPATCH_TOKEN não foi injetado no deploy');
    erro.status = 0;
    throw erro;
  }
  const res = await fetch(URL_DISPARO, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GH_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'infocard-bot',
    },
    body: fetch.body.json({ ref: 'main', inputs: { alvo: String(alvo), chat: String(chatId) } }),
  });
  if (res.status !== 204) {
    const corpo = await res.text();
    const erro = new Error(`GitHub respondeu ${res.status}: ${corpo.slice(0, 300)}`);
    erro.status = res.status;
    throw erro;
  }
}
