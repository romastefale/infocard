# AGENTS.md

Orientação para assistentes de IA e pessoas neste repositório. Mantenha curto e verdadeiro.

## O que é

Bot de Telegram no Telegram Serverless. Recebe `@username` ou ID numérico, no privado ou inline, e responde com o que o Bot API devolve. Não tem Mini App nem endpoints. O banco tem só a tabela `disparos`. Detalhes em `README.md`.

## Regras do dono

- Sem comentários no código.
- Sem testes escritos por quem escreveu o código. A verificação é a execução real: deploy e Actions.
- Não afirmar como fato o que não tenha fonte verificável. Dizer o que não foi verificado.
- Nenhuma falha silenciosa: todo erro chega a quem usou, com a causa.
- Publicar direto na `main`. Cada push em `tgcloud/**` vai ao ar.
- Fontes: `docs/Serverless-OFFICIAL`, `docs/tgcloud-sdk.md`, a documentação do Bot API em `romastefale/loggerview` (pasta `biblioteca/core-telegram-org-bots-api`) e o projeto estável `romastefale/abafigurinhas` como referência.

## Estrutura

| Caminho | O que é |
|---|---|
| `tgcloud/handlers/` | Um arquivo por tipo de update: `message.js`, `inline_query.js`. Sem subpastas. |
| `tgcloud/lib/` | Módulos compartilhados. |
| `tgcloud/schema.js` | Schema do banco. Tabela `disparos` (controle de limite das buscas MTProto). A plataforma recusa módulo vazio. |
| `.github/workflows/deploy.yml` | Publica a cada push em `main` que altera `tgcloud/**` e arquivos de configuração. |
| `.github/workflows/resolver.yml` | Resolve `@username` por MTProto com `scripts/resolver.py` e responde ao chat pela Bot API. O bot o dispara em `lib/despacho.js`. |
| `tgcloud/lib/segredos.js` | No git só tem valor vazio. O `deploy.yml` o sobrescreve no runner com o secret `GH_DISPATCH_TOKEN` antes do `push`. Nunca commitar o token. |
| `.tgcloud/` | Estado do CLI. Nunca editar nem ler. |

Só `.js` dentro de `tgcloud/` vai para a nuvem.

## Regras do runtime (documentação do Serverless)

- Importar módulos do projeto por caminho relativo com `.js`; o SDK pelo nome (`'sdk'`, `'sdk/db'`).
- Sem sistema de arquivos e sem pacotes npm.
- O handler recebe o payload do update (`Message`, `InlineQuery`); o `Update` completo está em `ctx.update`.
- Toda chamada de banco é assíncrona: sempre `await`.
- Sem chaves estrangeiras. Remoção só por `.deprecated('motivo')`. Mudança de tipo é manual.
- Publicar não altera o banco. O `migrate --safe` do CI só aplica mudanças aditivas.
- O `push` espelha a pasta: o que for editado só no @BotFather é sobrescrito.

## Fatos observados

- `getChat` com `@username` só resolve supergrupo, canal e bot. Usuário comum devolve `400 chat not found`. Fonte: código do servidor do Bot API (`Client.cpp`, `TdOnCheckChatCallback`) e execução na plataforma.
- Na plataforma, o `fetch` falha para `t.me`, `telegram.me` e `telegram.dog`, e responde para `telegram.org`, `api.telegram.org` e `example.com`.
- O `contacts.resolveUsername` por MTProto com o token do bot, rodando no Actions com Telethon 1.45.0, resolveu um username de usuário comum para o ID.
- Runtime do Serverless (observado em execução): existem `crypto`, `crypto.subtle`, `crypto.getRandomValues`, `BigInt`, `TextEncoder`, `TextDecoder`, `WebAssembly` e `DataView`. Não existem `atob`, `btoa`, `URL`, `setTimeout`, `performance` nem `WebSocket`. Medições com `Date.now()` deram 0 ms durante a execução.
- O `fetch` devolve bytes exatos (um PNG de 28159 bytes veio com a assinatura correta) e aceita `Uint8Array` no corpo.
- MTProto por HTTP: do runner do Actions, `http://149.154.167.51:80/api` respondeu 200 com `resPQ` válido. De dentro do Serverless, os mesmos endereços por IP respondem `403 access denied` do Squid (proxy de saída da plataforma). `https://venus.web.telegram.org/api` responde 403 do nginx do Telegram de qualquer origem. Conclusão: o MTProto não roda dentro do Serverless; por isso a busca por MTProto roda no Actions.
- O `push` recusa módulo vazio: `Error: Module code is empty` (observado ao esvaziar o `schema.js`).
- O link `tg://user?id=` só funciona dentro de link embutido ou botão, nunca em texto puro. Fonte: documentação do Bot API.

## Comandos

```
npx tgcloud status   # o que mudou localmente contra a nuvem
npx tgcloud run <módulo> '<payload>'   # executa na plataforma sem publicar
```

Não use `npx tgcloud` fora do projeto: sem o CLI local, o npx baixa um pacote avulso de mesmo nome.
