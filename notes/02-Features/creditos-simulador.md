---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-10-25
---
# Créditos e simulador de amortização

## Objetivo
Registar créditos e simular o efeito de pagamentos extra no prazo e nos juros.

## Comportamento esperado
- Simulação mês a mês: a poupança em juros nunca passa os juros que faltam e o prazo nunca é 0 meses
- Campo do extra aceita só algarismos e uma vírgula/ponto, 2 casas, nunca acima da dívida
- "Liquidar hoje" perto do fim: custo total e juros poupados, com nota sobre comissão de reembolso antecipado
- Se prestação + extra liquidam no 1.º mês, o simulador di-lo
- Despesa fixa ligada a um crédito usa `dm_credits.monthly_payment`

## Notas técnicas
- Ficheiros: `app/(tabs)/creditos.tsx`; o Otimizador de Dívida usa a mesma conta
- Supabase: `dm_credits`, `dm_recurring_expenses.credit_id`, `dm_assets.credit_id`
- Ligar despesa a crédito não tem UI — feito à mão na BD

## Ligações
- [[03-Decisoes/despesas-fixas-ligadas-a-creditos]]
- [[02-Features/calculadoras]]
- [[05-Releases/v1.6.0]]
