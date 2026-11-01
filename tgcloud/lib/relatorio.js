const TIPOS = {
  private: 'usuário (conversa privada)',
  group: 'grupo',
  supergroup: 'supergrupo',
  channel: 'canal',
};

function esc(valor) {
  return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function recorte(valor, limite) {
  const caracteres = Array.from(String(valor));
  return caracteres.length > limite ? `${caracteres.slice(0, limite).join('')}…` : caracteres.join('');
}

export function relatorioLeitura(chat) {
  const nome = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
  const linhas = [
    '<b>Lido pelo Bot API (getChat)</b>',
    `Tipo: ${esc(TIPOS[chat.type] ?? chat.type)}`,
    `ID: <code>${esc(chat.id)}</code>`,
  ];
  if (nome) linhas.push(`Nome: ${esc(recorte(nome, 200))}`);
  if (chat.title) linhas.push(`Título: ${esc(recorte(chat.title, 200))}`);
  if (chat.username) linhas.push(`Username: @${esc(chat.username)}`);
  if (Array.isArray(chat.active_usernames) && chat.active_usernames.length) {
    linhas.push(`Usernames ativos: ${chat.active_usernames.map((u) => `@${esc(u)}`).join(', ')}`);
  }
  if (chat.bio) linhas.push(`Bio: ${esc(recorte(chat.bio, 1000))}`);
  if (chat.description) linhas.push(`Descrição: ${esc(recorte(chat.description, 1000))}`);
  linhas.push(`Foto de perfil: ${chat.photo ? 'sim' : 'não retornada'}`);
  if (chat.type === 'private') {
    linhas.push(`<a href="tg://user?id=${esc(chat.id)}">Abrir perfil</a>`);
    linhas.push('O link só é garantido se a pessoa já falou com o bot em privado (regra do Telegram).');
  }
  const rotulo = nome || chat.title || `ID ${chat.id}`;
  const titulo = recorte(chat.username ? `${rotulo} (@${chat.username})` : rotulo, 100);
  return { titulo, html: linhas.join('\n') };
}

export function relatorioFalha(entrada, falha) {
  const linhas = ['<b>Não foi possível ler</b>', `Entrada: ${esc(entrada.rotulo)} (${entrada.tipo === 'id' ? 'ID' : 'username'})`];
  if (falha.apiErro) {
    linhas.push(`Bot API respondeu ${esc(falha.code)}: ${esc(recorte(falha.description, 500))}`);
    if (falha.parameters && falha.parameters.retry_after) {
      linhas.push(`Tente de novo em ${esc(falha.parameters.retry_after)} s.`);
    }
  } else {
    linhas.push(`Erro: ${esc(falha.name)}: ${esc(recorte(falha.message, 500))}`);
  }
  if (entrada.tipo === 'username') {
    linhas.push('O Bot API só resolve @username de canal ou supergrupo (getChat). Para usuário comum, envie o ID numérico.');
  }
  return { titulo: recorte(`Não lido: ${entrada.rotulo}`, 100), html: linhas.join('\n') };
}

export function relatorioInvalido(texto) {
  const recebido = String(texto ?? '').trim();
  const linhas = [
    '<b>Entrada não reconhecida</b>',
    'Envie um @username ou um ID numérico.',
    `Recebido: ${recebido ? esc(recorte(recebido, 100)) : '(sem texto)'}`,
  ];
  return { titulo: 'Envie um @username ou um ID', html: linhas.join('\n') };
}
