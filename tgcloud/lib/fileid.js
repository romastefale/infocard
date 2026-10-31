// Leitura do file_id do Bot API para achar o id do dono de uma foto de perfil.
// Funções puras (sem SDK), para poderem ser testadas fora da plataforma.
//
// O file_id é o binário serializado do TDLib, com zeros comprimidos (0x00 + contagem) e
// codificado em base64url. O runtime não tem Buffer (nem se pode contar com atob), então
// a decodificação é feita à mão.

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64urlParaBytes(texto) {
  const limpo = String(texto).replace(/=+$/, '');
  const saida = [];
  let acc = 0;
  let bits = 0;
  for (const c of limpo) {
    const v = ALFABETO.indexOf(c);
    if (v < 0) throw new Error('file_id inválido (caractere fora do base64url)');
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      saida.push((acc >> bits) & 0xff);
      acc &= (1 << bits) - 1;
    }
  }
  return Uint8Array.from(saida);
}

// 0x00 seguido de N = N zeros.
export function rleDecode(bytes) {
  const saida = [];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0 && i + 1 < bytes.length) {
      const n = bytes[++i];
      for (let k = 0; k < n; k++) saida.push(0);
    } else {
      saida.push(bytes[i]);
    }
  }
  return Uint8Array.from(saida);
}

const FLAG_WEB = 1 << 24;
const FLAG_REF = 1 << 25;
const LIMITE_ID = 10n ** 15n; // mesmo teto do bot Python

// Leitura estrutural: tipo, dc, [file_reference], id, access_hash, e a origem da foto.
// Origem 2 (miniatura do perfil) ou 3 (perfil grande) carrega o id do dono (dialog_id).
export function lerEstrutura(dados) {
  const dv = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);
  let pos = 0;
  const precisa = (n) => {
    if (pos + n > dados.length) throw new Error('file_id curto demais');
  };
  const i32 = () => { precisa(4); const v = dv.getInt32(pos, true); pos += 4; return v; };
  const i64 = () => { precisa(8); const v = dv.getBigInt64(pos, true); pos += 8; return v; };

  const tipoEFlags = i32();
  const dc = i32();
  const info = { tipo: tipoEFlags & ~(FLAG_WEB | FLAG_REF), dc, variante: null, dialogId: null };
  if (tipoEFlags & FLAG_WEB) return info; // arquivo da web: não tem origem de foto
  if (tipoEFlags & FLAG_REF) {
    precisa(1);
    let tamanho = dados[pos];
    let cabecalho = 1;
    if (tamanho === 254) {
      precisa(4);
      tamanho = dados[pos + 1] | (dados[pos + 2] << 8) | (dados[pos + 3] << 16);
      cabecalho = 4;
    }
    pos += Math.ceil((cabecalho + tamanho) / 4) * 4;
  }
  i64(); // id do arquivo
  i64(); // access_hash
  // tipos de foto: 0 miniatura, 1 foto de perfil, 2 foto
  if (info.tipo > 2) return info;
  info.variante = i32();
  if (info.variante === 2 || info.variante === 3) {
    const dialog = i64();
    if (dialog > 0n && dialog < LIMITE_ID) info.dialogId = Number(dialog);
  }
  return info;
}

// A busca do bot Python, igual: acha o marcador 2 ou 3 e lê um int64 logo depois (a 1 ou 4 bytes).
// Pode dar falso positivo; por isso só é usada quando a leitura estrutural não acha nada.
export function buscaHeuristica(dados) {
  const dv = new DataView(dados.buffer, dados.byteOffset, dados.byteLength);
  const fim = Math.max(0, dados.length - 24);
  for (let off = 0; off < fim; off++) {
    if (dados[off] !== 2 && dados[off] !== 3) continue;
    for (const deslocamento of [1, 4]) {
      const inicio = off + deslocamento;
      if (inicio + 8 > dados.length) continue;
      const v = dv.getBigInt64(inicio, true);
      if (v > 0n && v < LIMITE_ID) return Number(v);
    }
  }
  return null;
}

// Devolve { userId, metodo } ou lança Error com o motivo (que aparece no resultado inline).
export function dialogIdDoFileId(fileId) {
  const bruto = base64urlParaBytes(fileId);
  let detalhe = '';
  try {
    const info = lerEstrutura(rleDecode(bruto));
    if (info.dialogId) return { userId: info.dialogId, metodo: 'estrutura' };
    detalhe = `tipo ${info.tipo}, origem ${info.variante === null ? 'n/d' : info.variante}`;
  } catch (e) {
    detalhe = e.message;
  }
  const achado = buscaHeuristica(bruto);
  if (achado) return { userId: achado, metodo: 'heurística' };
  throw new Error(`dialogId not found in file_id (${detalhe})`);
}
