---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-09-18
---
# dm_portfolio_assets.id é text, não uuid

**Como reproduzir:** função Postgres com `p_asset_id uuid` a comparar com `dm_portfolio_assets.id`.
**Esperado vs. atual:** erro `operator does not exist: text = uuid`.
**Causa:** o id é gerado pela app; parece um UUID mas a coluna é `text`. O `deno check` não valida SQL dentro de `.rpc()`.
**Correção:** `p_asset_id text`. **Armadilha:** confirmar sempre o tipo real em `information_schema.columns` antes de escrever funções.

Ligações: [[03-Decisoes/idempotencia-escritas]]
