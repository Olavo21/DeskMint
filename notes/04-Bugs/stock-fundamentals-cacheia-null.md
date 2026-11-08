---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-09-23
---
# stock-fundamentals cacheava resultados nulos

**Como reproduzir:** a Finnhub devolve 429/5xx/timeout numa das três chamadas (`stock/metric`, `profile2`, `quote`).
**Esperado vs. atual:** esperado um erro visível; antes vinha HTTP 200 com tudo a `null`, gravado na `dm_fundamentals_cache` e servido 5 min — parecia "ativo sem cobertura".
**Causa:** não verificava `res.ok` antes de `.json()`; o leitor da cache não valida o conteúdo.
**Correção:** a função devolve 503 se alguma resposta não vier `ok`, e só grava cache e rate limit depois das três `ok` — ver [[03-Decisoes/cache-nao-guarda-falhas]]. Nunca logar `res.url` (traz o token).

**Os outros dois pontos do mesmo levantamento (23 set 2026):**
- *429 e "sem cobertura" na mesma resposta do `investment-chat`* — separados em `2cbc043` (`erro_api` / `erro_rede` / `sem_cobertura`). A 8 nov 2026 o 429 passou a ter motivo próprio, `limite_pedidos`, e o modelo diz ao utilizador para tentar daqui a pouco; o `get_news` faz o mesmo.
- *Nenhuma falha da Finnhub chega ao Sentry* — corrigido a 8 nov 2026 com `supabase/functions/_shared/sentry.ts`. O `investment-chat` (quote, company-news) e o `stock-fundamentals` (metric, profile2, quote) reportam 429, 401/403, 5xx, outros erros HTTP e timeouts (8 s), um evento por endpoint e tipo de falha. Tags: `edge_function`, `runtime:edge`, `finnhub_endpoint`, `finnhub_failure` (`rate_limit` / `auth_error` / `server_error` / `http_error` / `timeout` / `network`); `environment: production`. "Sem cobertura" não é reportado.
- *Validado a 8 nov 2026*: um 401 real da Finnhub passado pelo helper chegou ao Sentry (REACT-NATIVE-4), no mesmo projeto da app — o `SENTRY_DSN` das edge functions é o mesmo DSN. A tag `function` era descartada pelo Sentry (chave reservada), daí `edge_function`. Para separar backend da app: filtrar por `runtime:edge`.

**Estado do deploy:** feito a 8 nov 2026 (commit `7830bd1`; `investment-chat` v12, `stock-fundamentals` v10). Store API do Sentry confirmada pelo teste acima. **Validado ao vivo a 8 nov 2026, 18:41:** "Auto" no telemóvel com NVDA.US → `GET stock-fundamentals` 200, servido pela v10 (arranque a frio 35 ms, resposta ~1,9 s), valores e semáforos preenchidos, nenhum evento no Sentry (correto, não houve falha). Os campos EV/EBITDA e Receita/Emp. vazios são outro bug, anterior ao deploy: [[04-Bugs/fundamentals-chaves-finnhub-erradas]].

**Fica para a 1.7.0 (precisa de build):** o `FundamentalsModal` mostra o mesmo "Erro ao buscar dados" para um 429 e para qualquer outra falha — ver [[02-Features/finnhub-proxy]].

Ligações: [[02-Features/analise-fundamentalista]], [[02-Features/assistente-srmint]], [[02-Features/sentry]], [[04-Bugs/expo-public-finnhub-key]]
