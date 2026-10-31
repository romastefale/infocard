import { api, fetch } from 'sdk';
import { CACHE_CHAT_ID } from './config.js';
import { USUARIO_VALIDO, extrairFoto } from './pagina.js';
import { dialogIdDoFileId } from './fileid.js';

async function pagina(usuario) {
  const res = await fetch(`https://t.me/${usuario}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`t.me respondeu ${res.status}`);
  return await res.text();
}

async function fileIdDaFoto(url) {
  if (!CACHE_CHAT_ID) {
    throw new Error('Defina CACHE_CHAT_ID em tgcloud/lib/config.js (chat privado de cache do bot)');
  }
  const msg = await api.sendPhoto({ chat_id: CACHE_CHAT_ID, photo: url, disable_notification: true });
  return msg.photo[msg.photo.length - 1].file_id;
}

export async function resolver(usuario) {
  if (!USUARIO_VALIDO.test(usuario)) throw new Error('username inválido');
  const imagem = extrairFoto(await pagina(usuario));
  const fileId = await fileIdDaFoto(imagem);
  const { userId, metodo } = dialogIdDoFileId(fileId);
  return { userId, fileId, imagem, metodo };
}
