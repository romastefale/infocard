import { consultar } from '../lib/consulta.js';
import { enviarMensagem } from '../lib/envio.js';
import { relatorioCompartilhados, relatorioEncaminhada, relatorioContato, relatorioMencionados, relatorioErro } from '../lib/relatorio.js';

function usuariosMencionados(message) {
  const entidades = [...(message.entities || []), ...(message.caption_entities || [])];
  return entidades.filter((e) => e.type === 'text_mention' && e.user).map((e) => e.user);
}

export default async function (message) {
  if (message.chat.type !== 'private') return;
  let resposta;
  try {
    const mencionados = usuariosMencionados(message);
    if (message.users_shared) {
      resposta = relatorioCompartilhados(message.users_shared.users || []);
    } else if (message.forward_origin) {
      resposta = relatorioEncaminhada(message.forward_origin);
    } else if (message.contact) {
      resposta = relatorioContato(message.contact);
    } else if (mencionados.length) {
      resposta = relatorioMencionados(mencionados);
    } else {
      resposta = await consultar(message.text || '', { canal: 'privado', chatId: message.chat.id });
    }
  } catch (e) {
    console.error('falha ao montar a resposta:', e);
    resposta = relatorioErro(e);
  }
  await enviarMensagem(message.chat.id, resposta.html, resposta.teclado);
}
