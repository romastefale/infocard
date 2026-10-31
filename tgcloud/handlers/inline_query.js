// handlers/inline_query.js — roda a cada consulta inline (@bot usuario).
// Responde com um resultado: @usuario, o id e o link tg://user?id=<id>; se falhar,
// o resultado mostra o erro (igual ao bot Python).
import { api } from 'sdk';
import { resolver } from '../lib/resolver.js';

export default async function (query) {
  const usuario = (query.query || '').trim().replace(/^@+/, '');
  if (!usuario) {
    await api.answerInlineQuery({ inline_query_id: query.id, results: [], cache_time: 0, is_personal: true });
    return;
  }

  let texto;
  try {
    const { userId, metodo } = await resolver(usuario);
    texto = `@${usuario}\n${userId}\ntg://user?id=${userId}`;
    if (metodo === 'heurística') texto += '\n(id obtido pela busca heurística)';
  } catch (e) {
    console.error('inline_query falhou:', e);
    texto = `@${usuario}\n${e.name || 'Error'}: ${String(e.description || e.message || e).slice(0, 500)}`;
  }

  await api.answerInlineQuery({
    inline_query_id: query.id,
    results: [{
      type: 'article',
      id: 'resultado',
      title: `@${usuario}`.slice(0, 64),
      input_message_content: { message_text: texto },
    }],
    cache_time: 0,
    is_personal: true,
  });
}
