import { fetch } from 'sdk';

function hex(bytes, n) {
  return Array.from(bytes.slice(0, n), (b) => b.toString(16).padStart(2, '0')).join('');
}

function globais() {
  const nomes = ['crypto', 'TextEncoder', 'TextDecoder', 'BigInt', 'atob', 'btoa', 'WebAssembly', 'performance', 'setTimeout', 'structuredClone', 'URL', 'DataView', 'Uint8Array', 'CompressionStream', 'DecompressionStream'];
  const saida = {};
  for (const n of nomes) saida[n] = typeof globalThis[n];
  const c = globalThis.crypto;
  saida['crypto.subtle'] = c ? typeof c.subtle : 'sem crypto';
  saida['crypto.getRandomValues'] = c ? typeof c.getRandomValues : 'sem crypto';
  return saida;
}

async function lerCorpo(res) {
  const partes = [];
  const tipos = new Set();
  for await (const chunk of res.body) {
    tipos.add(typeof chunk + ':' + (chunk && chunk.constructor ? chunk.constructor.name : '?'));
    partes.push(chunk);
  }
  if (partes.length && typeof partes[0] === 'string') {
    const texto = partes.join('');
    return { tipos: [...tipos], bytes: Uint8Array.from(Array.from(texto, (ch) => ch.charCodeAt(0) & 0xff)), texto: true, tamanho: texto.length };
  }
  const total = partes.reduce((s, p) => s + p.length, 0);
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    bytes.set(p, pos);
    pos += p.length;
  }
  return { tipos: [...tipos], bytes, texto: false, tamanho: total };
}

function modPow(base, exp, mod) {
  let r = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp & 1n) r = (r * base) % mod;
    exp >>= 1n;
    base = (base * base) % mod;
  }
  return r;
}

function mdc(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

function fatorar(n) {
  if (n % 2n === 0n) return [2n, n / 2n];
  for (let c = 1n; c < 50n; c++) {
    let x = 2n;
    let y = 2n;
    let d = 1n;
    const f = (v) => (v * v + c) % n;
    while (d === 1n) {
      x = f(x);
      y = f(f(y));
      d = mdc(x > y ? x - y : y - x, n);
    }
    if (d !== n) return d < n / d ? [d, n / d] : [n / d, d];
  }
  return null;
}

async function pedirPQ(alvo) {
  const url = alvo.url;
  const nonce = new Uint8Array(16);
  for (let i = 0; i < 16; i++) nonce[i] = Math.floor(Math.random() * 256);
  const corpo = new Uint8Array(40);
  const dv = new DataView(corpo.buffer);
  dv.setBigUint64(8, (BigInt(Date.now()) * 4294967296n / 1000n) & ~3n, true);
  dv.setUint32(16, 20, true);
  dv.setUint32(20, 0xbe7e8ef1, true);
  corpo.set(nonce, 24);
  const headers = { ...(alvo.headers || {}) };
  if (alvo.ct !== null) headers['Content-Type'] = alvo.ct || 'application/octet-stream';
  const res = await fetch(url, { method: 'POST', headers, body: corpo });
  const lido = await lerCorpo(res);
  console.log(JSON.stringify(alvo), 'status', res.status, 'bytes', lido.tamanho);
  console.log('  cabecalhos', JSON.stringify(Array.from(res.headers.entries())));
  console.log('  inicio', hex(lido.bytes, 56));
  const b = lido.bytes;
  if (b.length < 60) return;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const construtor = v.getUint32(20, true).toString(16);
  const nonceOk = hex(b.slice(24, 40), 16) === hex(nonce, 16);
  console.log('  construtor', construtor, 'nonce igual', nonceOk);
  if (construtor !== '5162463' && construtor !== '05162463') return;
  const tam = b[56];
  const pq = b.slice(57, 57 + tam);
  let n = 0n;
  for (const x of pq) n = (n << 8n) | BigInt(x);
  const apos = 56 + 1 + tam;
  const pad = (4 - (apos % 4)) % 4;
  const ini = apos + pad;
  const qtd = v.getUint32(ini + 4, true);
  const impressoes = [];
  for (let i = 0; i < qtd; i++) impressoes.push(v.getBigUint64(ini + 8 + i * 8, true).toString(16));
  console.log('  pq', n.toString(), 'fingerprints', impressoes.join(','));
  const t0 = Date.now();
  const par = fatorar(n);
  console.log('  fatoração', par ? par[0].toString() + ' x ' + par[1].toString() : 'falhou', 'em', Date.now() - t0, 'ms');
}

export default async function () {
  console.log('globais', JSON.stringify(globais()));
  const t0 = Date.now();
  const mod = (1n << 2048n) - 159n;
  modPow(3n, (1n << 2047n) + 987654321n, mod);
  console.log('modPow 2048 bits', Date.now() - t0, 'ms');

  const png = await fetch('https://telegram.org/img/t_logo_2x.png');
  const p = await lerCorpo(png);
  console.log('png status', png.status, 'content-length', png.headers.get('content-length'), 'lido', p.tamanho, 'chunks', p.tipos.join(','), 'texto', p.texto, 'assinatura', hex(p.bytes, 8), '(esperado 89504e470d0a1a0a)');

  console.log('relogio', new Date().toISOString(), 'WebSocket', typeof globalThis.WebSocket, 'fetch.length', typeof fetch);
  const origem = { Origin: 'https://web.telegram.org', Referer: 'https://web.telegram.org/' };
  const alvos = [
    { url: 'https://venus.web.telegram.org/api', headers: origem },
    { url: 'https://venus.web.telegram.org/apiw', headers: origem },
    { url: 'https://venus.web.telegram.org/api', ct: 'application/x-www-form-urlencoded' },
    { url: 'https://venus.web.telegram.org/api', ct: null },
    { url: 'https://pluto.web.telegram.org/api', headers: origem },
    { url: 'https://flora.web.telegram.org/api', headers: origem },
    { url: 'https://venus-1.web.telegram.org/api', headers: origem },
    { url: 'http://149.154.167.51/api' },
    { url: 'http://149.154.167.51:80/apiw' },
    { url: 'http://149.154.167.91/api' },
    { url: 'http://91.108.56.130/api' },
    { url: 'http://149.154.175.50/api' },
  ];
  for (const alvo of alvos) {
    try {
      await pedirPQ(alvo);
    } catch (e) {
      console.log(JSON.stringify(alvo), 'FALHOU', e.name + ': ' + e.message);
    }
  }
  return { ok: true };
}
