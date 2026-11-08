---
tipo: feature
estado: feita
versao: 1.5.0
criado: 2026-08-22
---
# Alertas de teto (concentração)

## Objetivo
Avisar quando um bloco do portfólio passa um limite de concentração (ex.: Nvidia total ≤ 20%, cripto ≤ 5%, ETFs core ≥ 60%).

## Comportamento esperado
- Blocos definidos por ticker (com ou sem look-through) ou por tipo de ativo
- Limite máximo: `breached` se ≥ máx, `warning` a partir de 80% do máx
- Limite mínimo: `breached` se < mín, `warning` abaixo de 115% do mín
- Card no ecrã Investimentos com os 3 piores; sem blocos mostra "Nenhum teto configurado"
- Sugestões rápidas no modal: Nvidia total, Cripto, Ações satélite, ETFs core
- Tetos validados entre 0 e 100%

## Notas técnicas
- Ficheiros: `hooks/useThresholdAlerts.ts`, `components/investments/ThresholdsModal.tsx`, `components/investments/ThresholdAlertsCard.tsx`, `app/(tabs)/investimentos.tsx`
- Supabase: `dm_portfolio_thresholds` (RLS `user_id = auth.uid()`)

## Ligações
- [[02-Features/look-through-etf]]
- [[02-Features/investimentos-portefolio]]
- [[05-Releases/v1.5.0]]
