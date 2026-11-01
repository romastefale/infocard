import { api, BotApiError } from 'sdk';

const TECLADO = {
  keyboard: [[{ text: 'Escolher usuário', request_users: { request_id: 1, request_name: true, request_username: true, request_photo: true } }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

function textoPuro(html) {
  return html
    .replace(/<a href="([^"]*)">([^<]*)<\/a>/g, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function comFallback(enviarHtml, enviarPuro) {
  try {
    return await enviarHtml();
  } catch (e) {
    if (!(e instanceof BotApiError) || e.code !== 400) {
      console.error('envio recusado:', e instanceof BotApiError ? `${e.code} ${JSON.stringify(e.parameters ?? {})}` : e);
      throw e;
    }
    console.error('envio em HTML recusado, reenviando como texto puro:', e);
    return await enviarPuro();
  }
}

export function enviarMensagem(chatId, html, teclado = false) {
  const extra = teclado ? { reply_markup: TECLADO } : {};
  return comFallback(
    () => api.sendMessage({ chat_id: chatId, text: html, parse_mode: 'HTML', ...extra }),
    () => api.sendMessage({ chat_id: chatId, text: textoPuro(html), ...extra }),
  );
}

export function responderInline(queryId, titulo, html, botaoPrivado) {
  const responder = (conteudo) => api.answerInlineQuery({
    inline_query_id: queryId,
    results: [{ type: 'article', id: 'resultado', title: titulo, input_message_content: conteudo }],
    cache_time: 0,
    is_personal: true,
    ...(botaoPrivado ? { button: { text: `Buscar @${botaoPrivado} no privado`, start_parameter: botaoPrivado } } : {}),
  });
  return comFallback(
    () => responder({ message_text: html, parse_mode: 'HTML' }),
    () => responder({ message_text: textoPuro(html) }),
  );
}
