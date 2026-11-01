import { api } from 'sdk';
import { consultar } from '../lib/consulta.js';

export default async function (query) {
  const texto = (query.query || '').trim();
  if (!texto) {
    await api.answerInlineQuery({ inline_query_id: query.id, results: [], cache_time: 0, is_personal: true });
    return;
  }
  const { titulo, html } = await consultar(texto, { canal: 'inline' });
  await api.answerInlineQuery({
    inline_query_id: query.id,
    results: [{
      type: 'article',
      id: 'resultado',
      title: titulo,
      input_message_content: { message_text: html, parse_mode: 'HTML' },
    }],
    cache_time: 0,
    is_personal: true,
  });
}
