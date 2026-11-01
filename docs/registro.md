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
| Permissão do `GH_DISPATCH_TOKEN` depois da troca | deploy manual (`workflow_dispatch`) nº 18, 2026-11-01 17:53 UTC, mesmo código do nº 17 | passo "Validar a permissão…" verde | a execução inteira concluiu com sucesso, incluindo o passo de validação; o nº 17, 5 minutos antes, falhou nesse passo | runs 41333359017 (falha) e 41333747195 (sucesso) | Confirmado: o token agora tem permissão de disparo. Não prova que o bot dispara e que o job resolve |
| `push` com módulo vazio | `schema.js` com 0 bytes | publicar | `Error: Module code is empty`; nada foi publicado | run 41325623276 | Confirmado |
| Migração aditiva | tabela `disparos` nova | criar a tabela | `Migration complete. Applied: 1` | run 41329731536 | Confirmado |
| `migrate --safe --local` antes do `push` | sem mudança de schema; 2026-11-01 | sem erro | `No schema changes`, depois o `push` normal | run 41332145298 | Confirmado só para o caso sem mudança de schema |
| Webhook | vários deploys | handlers e webhook coerentes | `allowed updates: message, inline_query`, `in sync`, 0 pendentes | run 41332145298 | Confirmado nesses deploys |
| Envio de resposta HTML ao privado | `handlers/message` com chat real; versão anterior do relatório; 2026-11-01 | envio aceito | terminou sem exceção | run 41306849416 | Confirmado só para essa versão do texto |

## 2. Implementado, sem verificação ao vivo

| Comportamento | Onde | Já observado | Falta |
|---|---|---|---|
| Disparo do workflow pelo bot e resposta "Buscando…" | `consulta.js`, `despacho.js` | o token atual passa na validação do deploy | um disparo real feito pelo bot (204) e a resposta chegando |
| Relatório MTProto completo (bio, aniversário, dados comerciais, bot, canal) e envio da foto | `scripts/resolver.py` | usuário e bot lidos, foto enviada (seção 8) | `getFullChannel` com sucesso, e um usuário com bio, aniversário ou dados comerciais |
| Consulta de ID por MTProto | `resolver.py` (`entidade_por_id`) | ID 777000 resolvido (seção 8) | ID de usuário comum, de canal e de supergrupo |
| Botão "Escolher usuário", leitura de mensagem encaminhada e de contato | `envio.js`, `message.js`, `relatorio.js` | nada | uma execução real de cada |
| Limite por chat e total, em uma instrução SQL | `limite.js` | a tabela existe | uma execução, inclusive concorrente |
| Reserva desfeita se o disparo falha; bloqueio se o controle falha | `consulta.js` | nada | provocar as duas falhas |
| Reenvio em texto puro se o HTML for recusado | `envio.js`, `resolver.py` | nada | uma recusa real |
| Aviso ao chat quando o workflow falha sem responder | `resolver.yml` | nada | uma falha real do job |
| Validação do token no deploy | `deploy.yml` | detectou o 403 | o caso `422`, com token correto |

As correções do commit `4f634de` foram feitas em lote (oito alterações juntas); não há verificação individual de cada uma.

## 3. Hipóteses

- O MTProto resolve o ID de um usuário comum que nunca falou com o bot (`access_hash` 0). **Não sustentada pela primeira execução com usuário comum** (seção 8: ID 5249367417, sem dados e `UserIdInvalidError`); resolveu só o 777000, conta de serviço. Base original: o TDLib monta `inputUser(id, 0)` e `inputChannel(id, 0)` para bots (`UserManager.cpp`, `ChatManager.cpp`). Falta confirmar que o servidor aceita. Como confirmar: consultar o ID de alguém que nunca falou com o bot.
- `tigrao` é um username adicional da conta. Base: o campo `username` principal veio vazio. Como confirmar: ler os `usernames` ativos no relatório.
- O Telethon 1.45.0 expõe os campos lidos em `resolver.py`. A leitura é defensiva, então um campo ausente apenas não aparece.
- Reutilizar a sessão MTProto entre buscas poderia causar `AuthKeyDuplicatedError` com execuções simultâneas (aviso da documentação do Telethon). Não foi testado.
- Uma consulta que falhar com 400 por outro motivo que não "não encontrado" pode disparar a busca MTProto sem necessidade.
- O tempo de espera do job no Actions e o limite de uso do `resolveUsername` são desconhecidos.

## 4. Decisões vigentes

- Sem comentários no código; sem testes escritos por quem escreve o código; publicar direto na `main` (responsável pelo projeto).
- A busca MTProto só roda no privado; grupos são ignorados.
- No `resolver.py`, a espera pedida pelo Telegram (`FloodWait`) é cumprida e a operação é repetida, em qualquer chamada MTProto da busca, até 600 s de espera somada; o job tem `timeout-minutes: 15`. Acima disso o chat recebe a falha com o tempo pedido. Base: a política do TDLib de aguardar `FLOOD_WAIT_X` por X s. O valor 600 é escolha minha. Antes desta mudança o teto era 120 s e o run 41340057109 (espera de 129 s) desistiu.
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

## 6. Revisão de 2026-11-01 e limites

| Verificação | Resultado | Limite |
|---|---|---|
| Sintaxe de `scripts/resolver.py` (`ast.parse`) | sem erro | não executa o script nem exercita a API do Telethon |
| Sintaxe dos módulos `.js` (`node --check`) | sem erro | não resolve os imports do SDK nem executa nada |
| YAML dos workflows (`yaml.safe_load`) | sem erro | não prova que o GitHub aceita os passos |
| Busca por comentários em `tgcloud/` e `scripts/` | nenhum; as duas ocorrências de `//` são parte de `tg://` | só texto |
| Releitura de `consulta.js`, `despacho.js`, `limite.js`, `message.js`, `inline_query.js` | nenhum defeito novo encontrado | releitura por quem escreveu o código; não substitui execução |

Pendente: o token já passa na validação do deploy (seção 1, run 41333747195). Falta exercitar o bot: enviar o `@username` e o ID de alguém que nunca usou o bot e anotar aqui o resultado observado.

Os itens corrigidos em lote no commit `4f634de` não têm verificação individual; o registro os mantém na seção 2.

## 7. Lista de 15 apontamentos: situação no código em 2026-11-01

Conferido por leitura do código atual; nenhum item foi exercitado ao vivo.

| # | Apontamento | Situação no código | Observação |
|---|---|---|---|
| 1 | Limite falha aberto | Corrigido: sem controle de limite, o bot não dispara e avisa | IMPLEMENTADO |
| 2 | Limite não atômico | Corrigido: um `INSERT … SELECT … WHERE` e `rowsAffected` | IMPLEMENTADO |
| 3 | Disparo duplicado | Corrigido: só o `getChat` é repetido | IMPLEMENTADO |
| 4 | Retentativa sem espera | Não corrigido: o runtime não tem `setTimeout` (run 41326381391), então não há como esperar dentro do handler. Há uma única repetição imediata, só para `getChat` | Limitação |
| 5 | 429 / `retry_after` | 429 não é repetido; o `retry_after` é mostrado ao usuário | IMPLEMENTADO |
| 6 | Qualquer 400 aciona o MTProto | Mantido por decisão: não há classificação por texto de erro | DECISÃO |
| 7 | Fallback HTML perde conteúdo | Os relatórios só usam `<a href>`, `<b>` e `<code>` (conferido por busca no código). O link vira `texto (url)` no JavaScript e, desde esta revisão, também no `resolver.py`; `<b>` e `<code>` só perdem a formatação; o texto é escapado antes, e as entidades são desfeitas depois | IMPLEMENTADO |
| 8 | Indicador de foto | Corrigido: o relatório diz "enviada junto", "existe, mas não foi possível enviar" ou "não" | IMPLEMENTADO |
| 9 | Tamanho do relatório | Corrigido: o corte considera campos e avisos | IMPLEMENTADO |
| 10 | Erro HTTP vira erro de JSON | Corrigido: `chamar` tolera corpo não JSON | IMPLEMENTADO |
| 11 | Primeira entidade sem conferir | Corrigido: casamento por ID do peer | IMPLEMENTADO |
| 12 | `curl` sem falhar em 4xx/5xx | Corrigido: `--fail-with-body` | IMPLEMENTADO |
| 13 | Aceite do disparo como conclusão | Corrigido: o texto diz que a busca foi pedida e que a resposta só chega se ela concluir | IMPLEMENTADO |
| 14 | Reserva fica após falha | Corrigido: a reserva é liberada se o disparo falha | IMPLEMENTADO |
| 15 | Publicar antes de migrar | Corrigido: `migrate --safe --local` roda antes do `push` | VERIFICADO só para o caso sem mudança de schema (run 41332145298) |

## 8. Execuções do resolver em 2026-11-01 (19:05–19:14 UTC)

Salvo onde está indicado, disparadas por mim com `workflow_dispatch`, com resposta para o chat do responsável. Alvos: contas oficiais ou públicas. Logs só têm nomes de campos, não valores.

| Comportamento | Condições | Esperado | Observado | Evidência | Situação |
|---|---|---|---|---|---|
| Consulta por ID `777000` | ID `777000` (conta de serviço do Telegram) | resolver pelo ID | resolveu como usuário; foto e mensagem enviadas; job verde | run 41339952480 | Confirmado só para essa conta. O TDLib trata o 777000 como usuário conhecido, fixo no código, com hash embutido (`td/telegram/UserManager.cpp:5143-5149`); **não** é evidência para outros usuários |
| Username de bot | `@BotFather` | relatório completo | tipo `bot`; campos de bot e `about` lidos; foto e mensagem enviadas; job verde | run 41340054405 | Confirmado |
| `getFullUser` e `download_profile_photo` | os dois itens acima | campos do perfil completo e foto | perfil completo lido; foto enviada nos dois casos | runs 41339952480 e 41340054405 | Confirmado nesses dois casos |
| Username de canal sob limite do Telegram | `@telegram`, depois de duas buscas no mesmo minuto | resultado ou aviso | `FloodWaitError 129`, acima do `ESPERA_MAXIMA` de 120 s; o script enviou o aviso ao chat e saiu com erro (job vermelho); o passo de aviso final não reenviou | run 41340057109 | Confirmado: a falha chegou a quem consultou. O motivo do limite (três buscas em ~1 min) é hipótese |
| Username comum | `@enriquecimentos`, run que **não** foi disparada por mim | relatório | tipo `usuário`; só `first_name`, `id`, `username`, `status` na entidade; sem foto; mensagem enviada; job verde | run 41340128699 | Confirmado para o resolver. A origem do disparo não foi verificada; pode ter vindo do bot ou de um disparo manual |
| Consulta por ID de usuário comum, sem `access_hash` | ID `5249367417`, run **não** disparada por mim; depois repetido por mim com o código novo | dados do usuário | `users.getUsers` não devolveu o usuário (run 41340413917). Com a segunda via, `users.getFullUser` respondeu `UserIdInvalidError` (run 41340622977). Em ambos o chat recebeu a explicação; jobs vermelhos | runs 41340413917 e 41340622977 | Confirmado para esse ID: a consulta por ID sem hash não funcionou. Não generaliza para todo usuário comum; contradiz a expectativa tirada do código do TDLib |
| `@telegram` (canal) depois de ajustar a espera | mesmo alvo que antes deu `FloodWait` | relatório de canal | resolveu como canal; `getFullChannel` e foto; sem `FloodWait` desta vez | run 41340514301 | Confirmado para o canal. O caminho de espera nunca foi exercitado: o limite não voltou a ocorrer |

O que isto não prova: o bot disparar o workflow sozinho (nenhum log do bot foi lido), o botão "Escolher usuário", mensagem encaminhada, contato, o limite de 1 busca por chat e a liberação da reserva.

## 9. IDs numéricos deixam de disparar a busca MTProto (2026-11-01)

Base: (a) no `td`, um bot monta `inputUser(id, 0)` para usuário desconhecido (`UserManager.cpp:5332-5335`), mas o código não diz que o servidor aceita; (b) o 777000 é caso fixo do TDLib (`UserManager.cpp:5143-5149`); (c) o único ID de usuário comum testado falhou nas duas chamadas, `users.getUsers` e `users.getFullUser` (seção 8); (d) a documentação do `getChat` cobre ID ou username de supergrupo ou canal.

Mudança: para entrada numérica que o `getChat` não resolve, o bot responde na hora com o erro da API e indica o botão "Escolher usuário", a mensagem encaminhada e o `@username`, sem reservar limite nem disparar o workflow. Só `@username` dispara a busca MTProto. Canais e supergrupos por ID não foram testados e também deixam de disparar. Situação: IMPLEMENTADO; a resposta real do bot a um ID não foi observada. O caminho por ID do `resolver.py` continua acessível só por disparo manual do workflow.
