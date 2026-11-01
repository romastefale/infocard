# Infocard

Bot de Telegram no Telegram Serverless. Você envia um `@username` ou um ID numérico, no privado com o bot ou no modo inline (`@bot texto`), e ele responde com o que conseguir ler.

## O que ele lê

- **ID numérico:** consulta o `getChat` do Bot API. Se o Bot API devolver dados, o bot mostra tipo, ID, nome ou título, username, bio ou descrição e se há foto. Se não devolver, mostra o erro recebido.
- **@username de canal, supergrupo ou bot:** igual ao ID, pelo `getChat`.
- **@username de usuário comum:** o servidor do Bot API não resolve (`400 chat not found`). A busca por MTProto está em `.github/workflows/resolver.yml` e ainda não está ligada ao bot.
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
| `GH_DISPATCH_TOKEN` | reservado | token fino com Actions: escrita, para o bot disparar o `resolver.yml`; ainda não é usado |

## Estrutura

- `tgcloud/handlers/`: `message.js` (privado) e `inline_query.js`.
- `tgcloud/lib/`: `entrada.js` (lê @username ou ID), `consulta.js` (chama o `getChat`), `relatorio.js` (monta a resposta em HTML).
- `scripts/resolver.py` e `.github/workflows/resolver.yml`: busca de username por MTProto com Telethon.
- `docs/`: documentação oficial do Serverless e referência do SDK.
