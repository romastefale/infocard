// Extração da foto de perfil na página pública https://t.me/<usuario>.

export const USUARIO_VALIDO = /^[A-Za-z0-9_]{1,32}$/;

// equivalente ao html.unescape do bot Python, para as entidades que aparecem em URLs
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

// og:image, com property antes ou depois de content (as duas buscas do bot Python)
export function extrairFoto(html) {
  let m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(html);
  if (!m) m = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
  if (!m) throw new Error('profile photo not found');
  return desescapar(m[1]);
}
