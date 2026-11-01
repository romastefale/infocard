import { api, BotApiError } from 'sdk';
import { lerEntrada } from './entrada.js';
import { relatorioLeitura, relatorioFalha, relatorioInvalido } from './relatorio.js';

export async function consultar(texto) {
  const entrada = lerEntrada(texto);
  if (entrada.erro) return relatorioInvalido(texto);
  try {
    const chat = await api.getChat({ chat_id: entrada.chat_id });
    return relatorioLeitura(chat);
  } catch (e) {
    console.error('getChat falhou:', entrada.rotulo, e);
    if (e instanceof BotApiError) {
      return relatorioFalha(entrada, { apiErro: true, code: e.code, description: e.description, parameters: e.parameters });
    }
    return relatorioFalha(entrada, { apiErro: false, name: e.name, message: e.message });
  }
}
