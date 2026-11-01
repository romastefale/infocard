import { consultar } from '../lib/consulta.js';
import { enviarMensagem } from '../lib/envio.js';
import { relatorioCompartilhados, relatorioEncaminhada, relatorioContato } from '../lib/relatorio.js';

export default async function (message) {
  if (message.chat.type !== 'private') return;
  let resposta;
  if (message.users_shared) {
    resposta = relatorioCompartilhados(message.users_shared.users || []);
  } else if (message.forward_origin) {
    resposta = relatorioEncaminhada(message.forward_origin);
  } else if (message.contact) {
    resposta = relatorioContato(message.contact);
  } else {
    resposta = await consultar(message.text || '', { canal: 'privado', chatId: message.chat.id });
  }
  await enviarMensagem(message.chat.id, resposta.html, resposta.teclado);
}
