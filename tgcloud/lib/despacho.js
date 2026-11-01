import { fetch } from 'sdk';
import { GH_DISPATCH_TOKEN } from './segredos.js';

const EXPLICACOES = {
  401: 'O token do GitHub é inválido ou expirou. Gere outro e atualize o secret GH_DISPATCH_TOKEN.',
  403: 'O token do GitHub não tem permissão para disparar workflows. Ele precisa de "Actions: Read and write" neste repositório.',
  404: 'O token do GitHub não enxerga este repositório ou o workflow resolver.yml.',
  422: 'O GitHub rejeitou as entradas do workflow resolver.yml.',
};

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
    const erro = new Error(`${EXPLICACOES[res.status] ?? 'O GitHub recusou o disparo.'} (GitHub respondeu ${res.status}: ${corpo.slice(0, 200)})`);
    erro.status = res.status;
    throw erro;
  }
}
