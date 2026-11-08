---
tipo: decisao
data: 2026-08-22
---
# Rendimento fixo lê sempre a linha mais recente

**Contexto:** `dm_income` é mensal. Quando o mês civil mudava sem o utilizador reeditar o rendimento, a Dashboard mostrava 0 € e a "Conta à Ordem" ficava negativa.
**Decisão:** `useFixedBudget.ts` e `useDashboard.ts` ordenam por `year desc, month desc` e usam a primeira linha, sem filtro de mês.
**Alternativas consideradas:** (a) mês corrente com fallback explícito para o último conhecido; (b) separar "rendimento atual" de "histórico de rendimento".
**Consequências:** o histórico mensal de rendimento deixa de ser reconstruível pela Dashboard. Aceite para um utilizador; reavaliar antes de abrir a mais gente.

Ligações: [[02-Features/dashboard]]
