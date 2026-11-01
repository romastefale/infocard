import { consultar } from '../lib/consulta.js';
import { enviarMensagem } from '../lib/envio.js';

export default async function (message) {
  if (message.chat.type !== 'private') return;
  const { html } = await consultar(message.text || '', { canal: 'privado', chatId: message.chat.id });
  await enviarMensagem(message.chat.id, html);
}
