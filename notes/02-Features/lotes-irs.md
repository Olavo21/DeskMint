---
tipo: feature
estado: feita
versao: 1.5.0
criado: 2026-08-22
---
# Lotes e isenção de IRS

## Objetivo
Registar cada compra (lote) de um ativo e saber quando passa a estar isenta de IRS por detenção ≥ 365 dias.

## Comportamento esperado
- Cada lote tem data de compra, quantidade e preço unitário
- Mostra dias detidos, se está isento e quantos dias faltam
- Validação de limites máximos em quantidade/valor no `LotsModal`

## Notas técnicas
- Ficheiros: `hooks/usePortfolioLots.ts`, `components/investments/LotsModal.tsx`
- Supabase: `dm_portfolio_lots` (RLS `user_id = auth.uid()`)
- Datas: comparar sempre duas strings ISO (`localIsoToday()` vs `purchase_date`), ambas lidas como UTC. Misturar `Date.parse('AAAA-MM-DD')` com `new Date()` dava um dia de erro perto dos 365 dias (corrigido)

## Ligações
- [[02-Features/investimentos-portefolio]]
- [[04-Bugs/datas-utc-vs-local]]
- [[05-Releases/v1.5.0]]
