import { api, BotApiError } from 'sdk';
import { lerEntrada } from './entrada.js';
import { dispararBusca } from './despacho.js';
import { relatorioLeitura, relatorioFalha, relatorioInvalido, relatorioBuscando } from './relatorio.js';

function falhaDaApi(e) {
  if (e instanceof BotApiError) {
    return { apiErro: true, code: e.code, description: e.description, parameters: e.parameters };
  }
  return { apiErro: false, name: e.name, message: e.message };
}

export async function consultar(texto, contexto) {
  const entrada = lerEntrada(texto);
  if (entrada.erro) return relatorioInvalido(texto);
  try {
    return relatorioLeitura(await api.getChat({ chat_id: entrada.chat_id }));
  } catch (e) {
    console.error('getChat falhou:', entrada.rotulo, e);
    const falha = falhaDaApi(e);
    const naoResolvido = entrada.tipo === 'username' && falha.apiErro && falha.code === 400;
    if (!naoResolvido) return relatorioFalha(entrada, falha);
    if (contexto.canal !== 'privado') {
      return relatorioFalha(entrada, falha, ['A busca por MTProto só roda no privado: envie o @username ao bot em uma conversa privada.']);
    }
    try {
      await dispararBusca(entrada.chat_id.slice(1), contexto.chatId);
      return relatorioBuscando(entrada);
    } catch (erroDespacho) {
      console.error('dispararBusca falhou:', erroDespacho);
      return relatorioFalha(entrada, falha, [`Não consegui iniciar a busca por MTProto: ${erroDespacho.name}: ${erroDespacho.message}`]);
    }
  }
}
