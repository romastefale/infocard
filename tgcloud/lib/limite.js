import { db } from 'sdk';
import { and, eq, gt, lt } from 'sdk/db';
import { disparos } from '../schema.js';

const JANELA_SEGUNDOS = 60;
const POR_CHAT = 1;
const NO_TOTAL = 6;
const RETENCAO_SEGUNDOS = 3600;

export async function reservarDisparo(chatId) {
  const agora = Math.floor(Date.now() / 1000);
  const desde = agora - JANELA_SEGUNDOS;
  const doChat = await db.select().from(disparos).where(and(eq(disparos.chatId, chatId), gt(disparos.em, desde))).all();
  if (doChat.length >= POR_CHAT) {
    const maisRecente = Math.max(...doChat.map((linha) => linha.em));
    const espera = Math.max(1, maisRecente + JANELA_SEGUNDOS - agora);
    return { permitido: false, motivo: `Aguarde ${espera} s para fazer outra busca por MTProto.` };
  }
  const total = await db.$count(disparos, gt(disparos.em, desde));
  if (total >= NO_TOTAL) {
    return { permitido: false, motivo: 'Há muitas buscas por MTProto em andamento. Tente de novo em instantes.' };
  }
  await db.insert(disparos).values({ chatId, em: agora }).run();
  await db.delete(disparos).where(lt(disparos.em, agora - RETENCAO_SEGUNDOS)).run();
  return { permitido: true };
}
