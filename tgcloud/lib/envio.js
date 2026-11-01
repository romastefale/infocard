import { api, BotApiError } from 'sdk';

function textoPuro(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

async function comFallback(enviarHtml, enviarPuro) {
  try {
    return await enviarHtml();
  } catch (e) {
    if (!(e instanceof BotApiError) || e.code !== 400) throw e;
    console.error('envio em HTML recusado, reenviando como texto puro:', e);
    return await enviarPuro();
  }
}

export function enviarMensagem(chatId, html) {
  return comFallback(
    () => api.sendMessage({ chat_id: chatId, text: html, parse_mode: 'HTML' }),
    () => api.sendMessage({ chat_id: chatId, text: textoPuro(html) }),
  );
}

export function responderInline(queryId, titulo, html) {
  const responder = (conteudo) => api.answerInlineQuery({
    inline_query_id: queryId,
    results: [{ type: 'article', id: 'resultado', title: titulo, input_message_content: conteudo }],
    cache_time: 0,
    is_personal: true,
  });
  return comFallback(
    () => responder({ message_text: html, parse_mode: 'HTML' }),
    () => responder({ message_text: textoPuro(html) }),
  );
}
