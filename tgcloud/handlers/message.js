import { api } from 'sdk';
import { consultar } from '../lib/consulta.js';

export default async function (message) {
  if (message.chat.type !== 'private') return;
  const { html } = await consultar(message.text || '', { canal: 'privado', chatId: message.chat.id });
  await api.sendMessage({ chat_id: message.chat.id, text: html, parse_mode: 'HTML' });
}
