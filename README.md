# Infocard

Bot de Telegram no Telegram Serverless. Você envia um `@username` ou um ID numérico, no privado com o bot ou no modo inline (`@bot texto`), e ele responde com o que conseguir ler.

## O que ele lê

- **ID numérico:** consulta o `getChat` do Bot API. Se o Bot API devolver dados, o bot mostra tipo, ID, nome ou título, username, bio ou descrição e se há foto. Se não devolver, mostra o erro recebido.
- **@username de canal, supergrupo ou bot:** igual ao ID, pelo `getChat`.
- **@username de usuário comum:** o servidor do Bot API não resolve (`400 chat not found`). No privado, o bot responde "Buscando…" e dispara `.github/workflows/resolver.yml`, que resolve o username por MTProto (Telethon) e responde neste chat em dezenas de segundos. No inline isso não roda: o bot avisa para usar o privado. O relatório traz tudo o que o MTProto devolver para o tipo: de usuário (bio, aniversário, chats em comum, canal pessoal, dados comerciais, restrições, idioma, foto de perfil enviada junto), de bot (descrição, comandos, usuários ativos) e de canal ou supergrupo (descrição, membros, administradores, chat vinculado, modo lento, boosts). O que o Telegram não devolver por privacidade não aparece.
- **Limite das buscas MTProto:** 1 por chat a cada 60 s e 6 no total a cada 60 s, controlados na tabela `disparos`. Os valores são escolhas conservadoras minhas, e não limites do Telegram; ficam em `tgcloud/lib/limite.js`.
- Grupos são ignorados.

## Publicação

Cada push na `main` que altera `tgcloud/**`, `tgcloud.jsonc`, `package.json`, `package-lock.json` ou `deploy.yml` roda `.github/workflows/deploy.yml`: `fetch`, `status`, `push`, `migrate --safe` e `webhook`. O `push` espelha a pasta, então edições feitas no @BotFather são sobrescritas.

## Secrets do repositório

| Secret | Usado por | O que é |
|---|---|---|
| `TGCLOUD_TOKEN` | `deploy.yml` | Access token do CLI (`app<id>:<secret>`), do @BotFather em Serverless → CLI Access |
| `API_ID` | `resolver.yml` | de my.telegram.org/apps |
| `API_HASH` | `resolver.yml` | de my.telegram.org/apps |
| `BOT_TOKEN` | `resolver.yml` | token da Bot API do bot, do @BotFather |
| `GH_DISPATCH_TOKEN` | `deploy.yml` e bot | token fino só deste repositório, com Actions: escrita. O deploy o grava em `tgcloud/lib/segredos.js` na nuvem (o arquivo no git só tem um valor vazio); o bot o usa para disparar o `resolver.yml`. Para trocar o token, atualize o secret e rode o deploy |

## Estrutura

- `tgcloud/handlers/`: `message.js` (privado) e `inline_query.js`.
- `tgcloud/lib/`: `entrada.js` (lê @username ou ID), `consulta.js` (chama o `getChat` e, se falhar para username, a busca MTProto), `despacho.js` (dispara o workflow pela API do GitHub), `tentativa.js` (uma nova tentativa em falha transitória), `limite.js` (controle de buscas MTProto por chat e no total), `envio.js` (envia em HTML e, se o Telegram recusar, reenvia em texto puro), `segredos.js` (preenchido no deploy), `relatorio.js` (monta a resposta em HTML).
- `scripts/resolver.py` e `.github/workflows/resolver.yml`: busca de username por MTProto com Telethon.
- `docs/`: documentação oficial do Serverless e referência do SDK.
