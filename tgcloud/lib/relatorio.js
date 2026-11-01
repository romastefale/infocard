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

export function relatorioFalha(entrada, falha, extras = []) {
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
    linhas.push('O Bot API só resolve @username de canal, supergrupo ou bot (getChat).');
  }
  for (const extra of extras) linhas.push(esc(extra));
  return { titulo: recorte(`Não lido: ${entrada.rotulo}`, 100), html: linhas.join('\n'), teclado: true };
}

export function relatorioInvalido(texto) {
  const recebido = String(texto ?? '').trim();
  const linhas = [
    '<b>Entrada não reconhecida</b>',
    'Envie um @username ou um ID numérico, toque em "Escolher usuário" ou encaminhe uma mensagem da pessoa.',
    `Recebido: ${recebido ? esc(recorte(recebido, 100)) : '(sem texto)'}`,
  ];
  return { titulo: 'Envie um @username ou um ID', html: linhas.join('\n'), teclado: true };
}

export function relatorioBuscando(entrada) {
  const linhas = [
    '<b>Buscando…</b>',
    `Entrada: ${esc(entrada.rotulo)} (username)`,
    'O Bot API não resolveu essa entrada. Pedi a busca por MTProto; se ela concluir, a resposta chega neste chat. Se não chegar, a busca falhou ou ainda está na fila.',
  ];
  return { titulo: recorte(`Buscando ${entrada.rotulo}`, 100), html: linhas.join('\n') };
}

function blocoUsuario(u) {
  const nome = [u.first_name, u.last_name].filter(Boolean).join(' ');
  const linhas = [`ID: <code>${esc(u.user_id ?? u.id)}</code>`];
  if (nome) linhas.push(`Nome: ${esc(recorte(nome, 200))}`);
  if (u.username) linhas.push(`Username: @${esc(u.username)}`);
  linhas.push(`<a href="tg://user?id=${esc(u.user_id ?? u.id)}">Abrir perfil</a>`);
  return linhas;
}

export function relatorioCompartilhados(usuarios) {
  const blocos = usuarios.map((u) => {
    const linhas = blocoUsuario(u);
    linhas.splice(linhas.length - 1, 0, `Foto de perfil: ${Array.isArray(u.photo) && u.photo.length ? 'sim' : 'não informada'}`);
    return linhas.join('\n');
  });
  return { titulo: 'Usuário escolhido', html: ['<b>Lido do usuário escolhido (Bot API)</b>', ...blocos].join('\n\n') };
}

export function relatorioEncaminhada(origem) {
  const linhas = ['<b>Lido da mensagem encaminhada (Bot API)</b>'];
  if (origem.type === 'user') {
    linhas.push(...blocoUsuario(origem.sender_user));
  } else if (origem.type === 'hidden_user') {
    linhas.push(`O remetente oculta a conta nos encaminhamentos: ${esc(recorte(origem.sender_user_name, 200))}`, 'O Telegram não informa o ID nesse caso.');
  } else if (origem.type === 'chat') {
    linhas.push(`Enviada em nome de um chat: ${esc(recorte(origem.sender_chat.title ?? '', 200))}`, `ID: <code>${esc(origem.sender_chat.id)}</code>`);
  } else if (origem.type === 'channel') {
    linhas.push(`Origem: canal ${esc(recorte(origem.chat.title ?? '', 200))}`, `ID: <code>${esc(origem.chat.id)}</code>`);
    if (origem.chat.username) linhas.push(`Username: @${esc(origem.chat.username)}`);
  } else {
    linhas.push(`Origem de tipo ${esc(origem.type)}, sem tratamento.`);
  }
  return { titulo: 'Mensagem encaminhada', html: linhas.join('\n') };
}

export function relatorioContato(contato) {
  if (!contato.user_id) {
    return { titulo: 'Contato', html: '<b>Lido do contato (Bot API)</b>\nEsse contato não tem conta do Telegram associada.' };
  }
  return { titulo: 'Contato', html: ['<b>Lido do contato (Bot API)</b>', ...blocoUsuario(contato)].join('\n') };
}
