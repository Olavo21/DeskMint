---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-10-02
---
# Relatórios

## Objetivo
Resumo do que se faturou (salário + comissões) por mês e desde sempre.

## Comportamento esperado
- Aba **Mês**: "Este mês já faturaste" (inclui salário), "A receber deste mês", média de dias a receber (`service_date ?? earned_at` → `paid_at`, em dias de calendário)
- Aba **Desde sempre**: um único número — "Comissões faturadas" (exclui só `CANCELLED`). É um placeholder; tendência, composição, sazonalidade e velocidade de pagamento estão adiadas até haver volume
- Em erro não mostra 0,00 €

## Notas técnicas
- Ficheiros: `app/(tabs)/relatorios.tsx`, `hooks/useReports.ts`
- Queries: `monthly-report`, `all-time-report`
- Abas Pendentes e Semana removidas a 2 out 2026 (código no commit `584467e`); se a Semana voltar, filtrar por `service_date`, não `earned_at`

## Ligações
- [[02-Features/comissoes]]
- [[03-Decisoes/relatorios-abas-reduzidas]]
