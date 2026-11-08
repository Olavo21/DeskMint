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

**Ainda em aberto, do mesmo levantamento:** no `investment-chat`, 429 e "sem cobertura" colapsam no mesmo `{ disponivel: false }`; e nenhum caminho Finnhub reporta ao Sentry, por isso um 429 sustentado não dá sinal.

Ligações: [[02-Features/analise-fundamentalista]]
