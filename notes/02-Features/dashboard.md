---
tipo: feature
estado: feita
versao: 1.0.0
criado: 2026-07-15
---
# Dashboard

## Objetivo
Vista consolidada do estado financeiro: rendimento, despesas fixas, disponível, património líquido e projeção.

## Comportamento esperado
- Card "Orçamento Fixo": rendimento + despesas fixas lidas sempre da linha mais recente de `dm_income` (sem filtro de mês) — evita mostrar 0 € quando o mês muda
- Despesa fixa ligada a crédito usa `dm_credits.monthly_payment` em vez do `amount` próprio
- Net Worth: 5 categorias (Conta à Ordem, Fundo Emergência, Portfólio, Bens Ativos, Passivos)
- Projeção de longo prazo em euros de hoje (portfolio + fundo de emergência)
- Fundo de emergência: texto "6 meses" é fixo, não calculado

## Notas técnicas
- Supabase: `dm_income` (lê última linha), `dm_recurring_expenses`, `dm_credits`, `dm_portfolio_assets`, `dm_saving_buckets`
- `hooks/useDashboard.ts`, `hooks/useFixedBudget.ts`

## Ligações
- [[03-Decisoes/rendimento-fixo-ultima-linha]]
- [[05-Releases/v1.3.0]]
