---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-11-08
---
# PEG, EV/EBITDA e Receita/Emp. nunca vinham preenchidos no "Auto"

**Como reproduzir:** Análise de NVDA.US → "Auto". Os outros campos eram preenchidos; PEG, EV/EBITDA e Receita/Emp. ficavam vazios.
**Esperado vs. atual:** esperado PEG ≈ 0,46, EV/EBITDA ≈ 22,4 e Receita/Emp. ≈ 7,2M; vinha `null` nos três.
**Causa:** `supabase/functions/stock-fundamentals/index.ts` pedia chaves que não existem na resposta de `/stock/metric`. Estavam assim desde a criação da função, sem relação com o deploy de 8 nov.

| Campo | Chave pedida (não existe) | Chave real |
|---|---|---|
| PEG | `pegAnnual` | `pegTTM` |
| EV/EBITDA | `enterpriseValue/ebitdaAnnual` | `evEbitdaTTM` |
| Receita/Emp. | `revenuePerEmployeeTTM` / `revenuePerEmployeeAnnual` | `revenueEmployeeTTM` / `revenueEmployeeAnnual` |

O PEG só foi apanhado ao testar a correção: vinha `null` na NVDA e na AAPL.

**Correção (8 nov 2026, `stock-fundamentals` v11):**
- O mapeamento passou para `supabase/functions/stock-fundamentals/mapping.ts` (`mapFundamentals`), para poder ser testado contra respostas reais da Finnhub sem servir a função
- `num()` só aceita números finitos e devolve `null` em todos os outros casos, nunca 0
- Receita/Emp.: a Finnhub dá-a em **milhões de USD**, por isso multiplica-se por 1 000 000 (a app espera unidades). O rótulo € fica até à 1.7.0 — ver [[03-Decisoes/moeda-receita-empregado-aproximada]]
- **Cache:** a resposta leva um campo `v` (`RESPONSE_VERSION = 2`). O leitor da `dm_fundamentals_cache` só serve entradas com o `v` atual; as antigas (sem `v`) são tratadas como inexistentes e reescritas pelo upsert. Escolhido em vez de apagar linhas da tabela: não toca em dados de outras contas, e a regra fica para a próxima mudança da resposta (subir o `v`)

**Teste antes do deploy (chamada direta à Finnhub, passada pelo `mapFundamentals`):**

| | PEG | EV/EBITDA | Receita/Emp. |
|---|---|---|---|
| NVDA.US | 0,459 | 22,42 | 7 213 500 |
| AAPL.US | 3,062 | 29,27 | 2 884 500 |

**Validado a 8 nov 2026, 18:50**, com "Auto" na NVDA no telemóvel: PEG 0,46 (verde, "Potencialmente subavaliada"), EV/EBITDA 22,42 (laranja, "Razoável"), Receita/Emp. 7213500.00 (verde, "Excecional", com "≈ 7.2M por empregado" por baixo). Os positivos passaram de 5 para 7. A cache v1 não foi servida: os valores novos apareceram no primeiro toque.

Ligações: [[02-Features/analise-fundamentalista]], [[04-Bugs/stock-fundamentals-cacheia-null]], [[03-Decisoes/cache-nao-guarda-falhas]]
