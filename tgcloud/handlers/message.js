import { api } from 'sdk';

export default async function (message, ctx) {
  await api.sendMessage({
    chat_id: message.chat.id,
    text: `You said: ${message.text ?? '(no text)'}`,
  });
}
