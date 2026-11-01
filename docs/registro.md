# Registro de verificações, implementações, hipóteses e decisões

Data-base: 2026-11-01. Classificações:

- **VERIFICADO:** confirmado por execução reproduzível ou por fonte técnica citada.
- **IMPLEMENTADO:** existe no código; não foi exercitado ao vivo, ou só em parte.
- **HIPÓTESE:** explicação plausível, ainda não confirmada.
- **DECISÃO:** escolha do responsável pelo projeto, não exigência técnica universal.

Um teste confirma apenas o cenário que foi exercitado. Um deploy concluído demonstra que a publicação terminou, e não que o comportamento do bot está correto. As evidências são execuções do GitHub Actions: `https://github.com/romastefale/infocard/actions/runs/<número>`. Fontes lidas por cópia local: cópias da documentação do Serverless (extraídas em 10/10/2026 e 12/10/2026, no LoggerView e em `docs/`) e do Bot API (extraídas em 10/10, 12/10 e 17/10/2026, no LoggerView) (as páginas ao vivo de `core.telegram.org`, `docs.github.com` e `tl.telethon.dev` não abriram nesta sessão).

## 1. Verificações

| Comportamento | Condições | Esperado | Observado | Evidência | Situação |
|---|---|---|---|---|---|
| `getChat` com `@username` de usuário comum | SDK `api` do Serverless; `@tigrao` e um username inexistente; handlers rodados com `tgcloud run`; 2026-11-01 | dados do usuário | `400 Bad Request: chat not found` | runs 41306849416 e 41307104691 | Confirmado para esses dois casos |
| Causa do item anterior | leitura parcial do `Client.cpp` do `telegram-bot-api` (resumo de ferramenta, arquivo de 873 mil caracteres, não lido inteiro) | — | por username só são aceitos supergrupo, canal e bot | `tdlib/telegram-bot-api`, `TdOnCheckChatCallback` | Confirmado por leitura parcial |
| `fetch` do Serverless a hosts externos | `tgcloud run`; 2026-11-01 | resposta | falha: `t.me`, `telegram.me`, `telegram.dog`. Responde: `telegram.org`, `api.telegram.org`, `example.com`, `api.github.com` | runs 41307104691 e 41330709877 | Confirmado para esses hosts |
| Globais do runtime | `tgcloud run`; 2026-11-01 | — | existem: `crypto`, `crypto.subtle`, `crypto.getRandomValues`, `BigInt`, `TextEncoder`, `TextDecoder`, `WebAssembly`, `DataView`. Não existem: `atob`, `btoa`, `URL`, `setTimeout`, `performance`, `WebSocket`. Medições com `Date.now()` deram 0 ms | run 41326381391 | Confirmado |
| `fetch` com resposta binária | PNG de `telegram.org`; 2026-11-01 | bytes iguais | 28159 bytes, assinatura `89504e47…` correta | run 41326381391 | Confirmado para esse arquivo |
| MTProto por HTTP a partir do Serverless | POST de `req_pq_multi`; 2026-11-01 | `resPQ` | `http://149.154.167.51:80/api` e outros IPs: `403 access denied` do `squid/6.13`. `https://venus.web.telegram.org/api`: `403` do nginx | runs 41326381391 e 41326461110 | Confirmado |
| O mesmo pacote a partir do runner do Actions | 2026-11-01 | `resPQ` | IPs por HTTP: `200` com `resPQ` e nonce igual. `https://venus.web.telegram.org/api`: `403` | run 41326518485 | Confirmado |
| `contacts.resolveUsername` com o token do bot | Telethon 1.45.0 no Actions; `tigrao`; 2026-11-01 | ID do usuário | resolveu para o ID `8921622168`; `username` principal vazio | run 41325053290 | Confirmado para esse caso. A conta já tinha falado com o bot, então **não** prova o caso de quem nunca falou |
| `GH_DISPATCH_TOKEN` de dentro do Serverless | `tgcloud run`; 2026-11-01 | ler e disparar | lê o workflow (`200`); o disparo devolve `403 Resource not accessible by personal access token` | runs 41330709877, 41330779192 e 41332393101 | Confirmado: o token atual não pode disparar |
| `push` com módulo vazio | `schema.js` com 0 bytes | publicar | `Error: Module code is empty`; nada foi publicado | run 41325623276 | Confirmado |
| Migração aditiva | tabela `disparos` nova | criar a tabela | `Migration complete. Applied: 1` | run 41329731536 | Confirmado |
| `migrate --safe --local` antes do `push` | sem mudança de schema; 2026-11-01 | sem erro | `No schema changes`, depois o `push` normal | run 41332145298 | Confirmado só para o caso sem mudança de schema |
| Webhook | vários deploys | handlers e webhook coerentes | `allowed updates: message, inline_query`, `in sync`, 0 pendentes | run 41332145298 | Confirmado nesses deploys |
| Envio de resposta HTML ao privado | `handlers/message` com chat real; versão anterior do relatório; 2026-11-01 | envio aceito | terminou sem exceção | run 41306849416 | Confirmado só para essa versão do texto |

## 2. Implementado, sem verificação ao vivo

| Comportamento | Onde | Já observado | Falta |
|---|---|---|---|
| Disparo do workflow pelo bot e resposta "Buscando…" | `consulta.js`, `despacho.js` | o disparo dá 403 com o token atual | um disparo aceito (204) e a resposta chegando |
| Relatório MTProto completo (bio, aniversário, dados comerciais, bot, canal) e envio da foto | `scripts/resolver.py` | só o `resolveUsername` básico rodou | `getFullUser`, `getFullChannel`, `download_profile_photo` e o envio |
| Consulta de ID por MTProto | `resolver.py` (`entidade_por_id`) | nada | qualquer execução |
| Botão "Escolher usuário", leitura de mensagem encaminhada e de contato | `envio.js`, `message.js`, `relatorio.js` | nada | uma execução real de cada |
| Limite por chat e total, em uma instrução SQL | `limite.js` | a tabela existe | uma execução, inclusive concorrente |
| Reserva desfeita se o disparo falha; bloqueio se o controle falha | `consulta.js` | nada | provocar as duas falhas |
| Reenvio em texto puro se o HTML for recusado | `envio.js`, `resolver.py` | nada | uma recusa real |
| Aviso ao chat quando o workflow falha sem responder | `resolver.yml` | nada | uma falha real do job |
| Validação do token no deploy | `deploy.yml` | detectou o 403 | o caso `422`, com token correto |

As correções do commit `4f634de` foram feitas em lote (oito alterações juntas); não há verificação individual de cada uma.

## 3. Hipóteses

- O MTProto resolve o ID de quem nunca falou com o bot (`access_hash` 0). Base: o TDLib monta `inputUser(id, 0)` e `inputChannel(id, 0)` para bots (`UserManager.cpp`, `ChatManager.cpp`). Falta confirmar que o servidor aceita. Como confirmar: consultar o ID de alguém que nunca falou com o bot.
- `tigrao` é um username adicional da conta. Base: o campo `username` principal veio vazio. Como confirmar: ler os `usernames` ativos no relatório.
- O Telethon 1.45.0 expõe os campos lidos em `resolver.py`. A leitura é defensiva, então um campo ausente apenas não aparece.
- Reutilizar a sessão MTProto entre buscas poderia causar `AuthKeyDuplicatedError` com execuções simultâneas (aviso da documentação do Telethon). Não foi testado.
- Uma consulta que falhar com 400 por outro motivo que não "não encontrado" pode disparar a busca MTProto sem necessidade.
- O tempo de espera do job no Actions e o limite de uso do `resolveUsername` são desconhecidos.

## 4. Decisões vigentes

- Sem comentários no código; sem testes escritos por quem escreve o código; publicar direto na `main` (responsável pelo projeto).
- A busca MTProto só roda no privado; grupos são ignorados.
- Limite das buscas: 1 por chat e 6 no total a cada 60 s. Valores escolhidos por mim, não são limites do Telegram.
- Se o controle de limite falhar, o bot não dispara e avisa.
- Qualquer 400 do `getChat` de username ou ID inicia a busca MTProto. A entrada já é validada antes.
- Escrita e disparo não são repetidos; só o `getChat` é repetido uma vez, em falha de rede ou 5xx. Base: `NetQueryDelayer.cpp` do TDLib (o TDLib só repete em falha de transporte e em 500 com mensagem específica).
- O segredo do GitHub é gravado em `tgcloud/lib/segredos.js` no deploy, porque o runtime não tem variáveis de ambiente.
- A migração roda antes do `push` (`migrate --safe --local`).

## 5. Decisões superadas

| Decisão antiga | Motivo | Atual |
|---|---|---|
| Achar o ID dentro do `file_id` da foto enviada ao chat de cache (`CACHE_CHAT_ID`) | O código do TDLib atribui `PhotoSizeSource::thumbnail` às fotos de mensagem, sem `dialog_id` | Leitura pelo `getChat` e pelo MTProto |
| Ler a página pública `t.me` | O `fetch` do Serverless a bloqueia | MTProto no Actions |
| Seguir sem limite se o banco falhar | Fail-open | Fail-closed |
| Repetir o disparo do workflow | Um disparo duplicado inicia dois workflows | Sem repetição |
| `migrate` depois do `push` | Janela com código novo e schema antigo | `migrate --local` antes do `push` |
