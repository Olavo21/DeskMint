---
tipo: bug
estado: aberto
sentry: 
criado: 2026-11-08
---
# EV/EBITDA e Receita/Emp. nunca vêm preenchidos no "Auto"

**Como reproduzir:** Análise de NVDA.US → "Auto". Os outros campos são preenchidos, mas EV/EBITDA e Receita/Emp. ficam vazios.
**Esperado vs. atual:** esperado EV/EBITDA ≈ 22,4 e Receita/Emp. ≈ 7,2M; atual `null` nos dois.
**Causa:** `supabase/functions/stock-fundamentals/index.ts` pede chaves que não existem na resposta de `/stock/metric`:
- `m["enterpriseValue/ebitdaAnnual"]` — a chave real é `evEbitdaTTM` (NVDA: 22.4164)
- `m.revenuePerEmployeeTTM ?? m.revenuePerEmployeeAnnual` — as chaves reais são `revenueEmployeeTTM` / `revenueEmployeeAnnual` (NVDA: 7.2135 / 5.1414)

Confirmado a 8 nov 2026 com uma chamada direta à Finnhub. O bug não foi introduzido pelo deploy desse dia: as chaves estão assim desde a criação da função.

**Correção proposta (por fazer, precisa de deploy):**
- `evEbitda: m.evEbitdaTTM ?? null`
- `revenuePerEmployee`: a Finnhub devolve **milhões de USD**, mas a app espera unidades (o semáforo usa 1 000 000 / 200 000, e o placeholder é `6000000`). Fica `(m.revenueEmployeeTTM ?? m.revenueEmployeeAnnual) * 1_000_000`, se não for null
- A métrica está rotulada em € mas o valor vem em USD (é o único campo absoluto; os outros são rácios). Decidir se o rótulo passa a "$" ou se fica a aproximação
- Depois do deploy, as entradas de `dm_fundamentals_cache` (TTL de 5 min) expiram sozinhas, por isso não é preciso limpar nada

Ligações: [[02-Features/analise-fundamentalista]], [[04-Bugs/stock-fundamentals-cacheia-null]]
