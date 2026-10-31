// Testes locais das funções puras do inline (não roda na plataforma, não usa token).
// Os file_ids aqui são SINTÉTICOS, montados pelo formato do TDLib; eles provam que o código
// decodifica o que se espera, mas não provam o que o Telegram devolve de verdade.
import assert from 'node:assert/strict';
import { base64urlParaBytes, rleDecode, lerEstrutura, buscaHeuristica, dialogIdDoFileId } from '../tgcloud/lib/fileid.js';
import { extrairFoto, desescapar, USUARIO_VALIDO } from '../tgcloud/lib/pagina.js';

const i32 = (v) => { const b = Buffer.alloc(4); b.writeInt32LE(v); return [...b]; };
const i64 = (v) => { const b = Buffer.alloc(8); b.writeBigInt64LE(BigInt(v)); return [...b]; };
function rleEncode(bytes) {
  const out = [];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) { out.push(bytes[i]); continue; }
    let n = 0;
    while (i < bytes.length && bytes[i] === 0 && n < 255) { n++; i++; }
    i--; out.push(0, n);
  }
  return out;
}
const b64url = (bytes) => Buffer.from(bytes).toString('base64url');
const fileId = (partes) => b64url(rleEncode(partes.flat()));

// base64url: igual ao Buffer, com e sem padding
for (const n of [1, 2, 3, 4, 5, 31, 32, 100]) {
  const amostra = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 255);
  assert.deepEqual([...base64urlParaBytes(Buffer.from(amostra).toString('base64url'))], [...amostra]);
  assert.deepEqual([...base64urlParaBytes(Buffer.from(amostra).toString('base64'). replace(/\+/g, '-').replace(/\//g, '_'))], [...amostra]);
}
// RLE: ida e volta
const cru = [2, 0, 0, 0, 7, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 9];
assert.deepEqual([...rleDecode(Uint8Array.from(rleEncode(cru)))], cru);

// foto de perfil (origem 2) e perfil grande (origem 3): o dialogId volta pela leitura estrutural
for (const variante of [2, 3]) {
  const id = fileId([i32(1), i32(2), i64(5551234567), i64(-7788990011), i32(variante), i64(123456789), i64(42), [1, 0, 0]]);
  const r = dialogIdDoFileId(id);
  assert.equal(r.userId, 123456789);
  assert.equal(r.metodo, 'estrutura');
}
// com file_reference (flag 1<<25): bytes com tamanho e padding para múltiplo de 4
const ref = [3, 0xaa, 0xbb, 0xcc]; // tamanho 3 + cabeçalho 1 = 4
const comRef = fileId([i32(2 | (1 << 25)), i32(4), ref, i64(1), i64(2), i32(2), i64(987654321), i64(9), [4, 0]]);
assert.equal(dialogIdDoFileId(comRef).userId, 987654321);

// foto comum (origem 1, miniatura): NÃO há dialogId e o erro diz o porquê
const comum = fileId([i32(2), i32(2), i64(111), i64(222), i32(1), i32(2), i32(120), [4, 0]]);
assert.throws(() => dialogIdDoFileId(comum), /dialogId not found in file_id \(tipo 2, origem 1\)/);
assert.equal(lerEstrutura(rleDecode(base64urlParaBytes(comum))).dialogId, null);

// a busca heurística reproduz a do bot Python
const bruto = Uint8Array.from([9, 9, 2, 0xd2, 0x02, 0x96, 0x49, 0, 0, 0, 0, 0, ...Array(30).fill(1)]);
assert.equal(buscaHeuristica(bruto), 1234567890);
assert.equal(buscaHeuristica(Uint8Array.from(Array(40).fill(1))), null);

// página: og:image com as duas ordens de atributos e entidades HTML
assert.equal(extrairFoto('<meta property="og:image" content="https://cdn.x/a.jpg?x=1&amp;y=2">'), 'https://cdn.x/a.jpg?x=1&y=2');
assert.equal(extrairFoto("<meta content='https://cdn.x/b.jpg' property='og:image'>"), 'https://cdn.x/b.jpg');
assert.throws(() => extrairFoto('<html></html>'), /profile photo not found/);
assert.equal(desescapar('a&#38;b&#x26;c&quot;'), 'a&b&c"');
assert.ok(USUARIO_VALIDO.test('abc_123') && !USUARIO_VALIDO.test('a/b') && !USUARIO_VALIDO.test('') && !USUARIO_VALIDO.test('x'.repeat(33)));

console.log('ok: todos os testes passaram');
