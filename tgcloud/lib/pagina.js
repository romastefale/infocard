export const USUARIO_VALIDO = /^[A-Za-z0-9_]{1,32}$/;

function desescapar(texto) {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function extrairFoto(html) {
  let m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(html);
  if (!m) m = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  if (!m) throw new Error('profile photo not found');
  return desescapar(m[1]);
}
