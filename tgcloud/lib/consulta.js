import { api, BotApiError } from 'sdk';
import { lerEntrada } from './entrada.js';
import { dispararBusca } from './despacho.js';
import { comRetentativa } from './tentativa.js';
import { reservarDisparo } from './limite.js';
import { relatorioLeitura, relatorioFalha, relatorioInvalido, relatorioBuscando } from './relatorio.js';

const transitorioApi = (e) => !(e instanceof BotApiError) || e.code >= 500;
const transitorioGitHub = (e) => e.status === undefined || e.status >= 500;

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
    return relatorioLeitura(await comRetentativa(() => api.getChat({ chat_id: entrada.chat_id }), transitorioApi));
  } catch (e) {
    console.error('getChat falhou:', entrada.rotulo, e);
    const falha = falhaDaApi(e);
    const naoResolvido = falha.apiErro && falha.code === 400;
    if (!naoResolvido) return relatorioFalha(entrada, falha);
    if (contexto.canal !== 'privado') {
      return relatorioFalha(entrada, falha, ['A busca por MTProto só roda no privado: envie o @username ao bot em uma conversa privada.']);
    }
    let limite = { permitido: true };
    try {
      limite = await reservarDisparo(contexto.chatId);
    } catch (erroLimite) {
      console.error('controle de limite indisponível, seguindo sem ele:', erroLimite);
    }
    if (!limite.permitido) return relatorioFalha(entrada, falha, [limite.motivo]);
    try {
      await comRetentativa(() => dispararBusca(entrada.tipo === 'username' ? entrada.chat_id.slice(1) : String(entrada.chat_id), contexto.chatId), transitorioGitHub);
      return relatorioBuscando(entrada);
    } catch (erroDespacho) {
      console.error('dispararBusca falhou:', erroDespacho);
      return relatorioFalha(entrada, falha, [`Não consegui iniciar a busca por MTProto: ${erroDespacho.name}: ${erroDespacho.message}`]);
    }
  }
}
