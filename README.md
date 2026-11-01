# Infocard

Bot de Telegram no Telegram Serverless. Você envia um `@username` ou um ID numérico, no privado com o bot ou no modo inline (`@bot texto`), e ele apresenta os dados que a API disponibiliza para a entidade consultada. O que cada parte já foi verificada fazer, e o que não foi, está em `docs/registro.md`.

## O que ele tenta ler

- **ID numérico e @username:** consulta o `getChat` do Bot API (a documentação cobre ID de chat ou @username de supergrupo e canal). Quando o Bot API devolve dados, o bot mostra os que vierem (tipo, ID, nome ou título, username, bio ou descrição, se há foto).
- **@username de usuário comum:** o Bot API respondeu `400 chat not found` nos casos testados. No privado, o bot pede uma busca por MTProto (`.github/workflows/resolver.yml`, Telethon) e responde neste chat quando ela termina. No inline essa busca não roda: a resposta inline traz um botão "Buscar @usuario no privado" (`button` do `answerInlineQuery`), que abre o privado com o bot e envia `/start usuario`, e o bot faz a busca lá.
- **ID que o Bot API não conhece:** o bot responde com o erro da API e indica o botão "Escolher usuário", uma mensagem encaminhada ou o `@username`. Não dispara a busca por MTProto: o único ID de usuário comum testado não foi resolvido por ela, e a documentação do `getChat` cobre só ID ou username de supergrupo e canal.
- **Sem GitHub:** o botão "Escolher usuário", uma mensagem encaminhada da pessoa, um contato compartilhado e uma menção (`text_mention`) trazem o ID pelo próprio Bot API, quando o Telegram o informar. Estão implementados e ainda não foram exercitados.
- Grupos são ignorados.

O que o Telegram não devolver, por privacidade ou por restrição da API, não aparece.

## Limitações conhecidas

- A busca por MTProto depende do `GH_DISPATCH_TOKEN` ter permissão para disparar workflows. O deploy nº 18 passou na validação dessa permissão; um disparo feito pelo próprio bot ainda não foi observado.
- Se o Telegram pedir espera (`FloodWait`), o job espera e repete, até 600 s somados; acima disso, avisa o chat com o tempo pedido.
- Cada busca MTProto roda em um job do Actions; o tempo até a resposta depende da fila e do job, e não foi medido.
- Limite das buscas MTProto: 1 por chat e 6 no total a cada 60 s. São valores escolhidos pelo responsável do projeto, não limites do Telegram (`tgcloud/lib/limite.js`).

## Publicação

Cada push na `main` que altera `tgcloud/**`, `tgcloud.jsonc`, `package.json`, `package-lock.json` ou `deploy.yml` roda `.github/workflows/deploy.yml`: `fetch`, `status`, `migrate --safe --local`, `push`, `webhook` e a validação do `GH_DISPATCH_TOKEN`. A validação roda por último: se o token não puder disparar o workflow, a execução fica vermelha depois de os módulos serem publicados. O `push` espelha a pasta, então edições feitas no @BotFather são sobrescritas.

## Secrets do repositório

| Secret | Usado por | O que é |
|---|---|---|
| `TGCLOUD_TOKEN` | `deploy.yml` | Access token do CLI (`app<id>:<secret>`), do @BotFather em Serverless → CLI Access |
| `API_ID` | `resolver.yml` | de my.telegram.org/apps |
| `API_HASH` | `resolver.yml` | de my.telegram.org/apps |
| `BOT_TOKEN` | `resolver.yml` | token da Bot API do bot, do @BotFather |
| `GH_DISPATCH_TOKEN` | `deploy.yml` e bot | token fino só deste repositório, com a permissão Actions: Read and write. O deploy o grava em `tgcloud/lib/segredos.js` na nuvem (o arquivo no git só tem um valor vazio). Para trocar o token, atualize o secret e rode o deploy |

## Estrutura

- `tgcloud/handlers/`: `message.js` (privado) e `inline_query.js`.
- `tgcloud/lib/`: `entrada.js`, `consulta.js`, `despacho.js`, `tentativa.js`, `limite.js`, `envio.js`, `segredos.js`, `relatorio.js`.
- `scripts/resolver.py` e `.github/workflows/resolver.yml`: busca por MTProto.
- `docs/`: documentação do Serverless, referência do SDK e `registro.md`.
