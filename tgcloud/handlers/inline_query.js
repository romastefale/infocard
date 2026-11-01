import { api } from 'sdk';
import { consultar } from '../lib/consulta.js';
import { responderInline } from '../lib/envio.js';

export default async function (query) {
  const texto = (query.query || '').trim();
  if (!texto) {
    await api.answerInlineQuery({ inline_query_id: query.id, results: [], cache_time: 0, is_personal: true });
    return;
  }
  const { titulo, html } = await consultar(texto, { canal: 'inline' });
  await responderInline(query.id, titulo, html);
}
