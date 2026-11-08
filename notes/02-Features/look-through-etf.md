---
tipo: feature
estado: feita
versao: 1.5.0
criado: 2026-08-22
---
# Look-through de ETFs

## Objetivo
Ver a exposição real a cada empresa, somando o que se detém diretamente e o que se detém através dos ETFs.

## Comportamento esperado
- Composição dos ETFs registada à mão (ticker + peso)
- Por ticker: % direta, % via cada ETF, % total
- Posições diretas sem nenhum ETF que as contenha também aparecem (corrigido: antes eram ignoradas e davam 0%)

## Notas técnicas
- Ficheiros: `hooks/useEtfComposition.ts` (`useLookThrough`)
- Supabase: `dm_etf_composition` (RLS `user_id = auth.uid()`)
- Alimenta os [[02-Features/alertas-teto]] com `use_look_through`

## Ligações
- [[02-Features/investimentos-portefolio]]
- [[05-Releases/v1.5.0]]
