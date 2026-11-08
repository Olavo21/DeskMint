---
tipo: feature
estado: feita
versao: 1.5.0
criado: 2026-08-22
---
# Análise fundamentalista

## Objetivo
Mostrar métricas fundamentais de um ativo (P/E, ROE, dívida/capital…) a partir da Finnhub.

## Comportamento esperado
- Botão "Auto" no `FundamentalsModal` vai buscar os dados (só por toque, sem retry nem polling)
- Cache de 5 min por utilizador+ticker; limite de 20 chamadas/hora; cache-hit não conta
- Ao trocar de ativo o modal começa limpo (`key={fundAsset?.id}` força remount)

## Notas técnicas
- Ficheiros: `components/investments/FundamentalsModal.tsx`, `components/investments/AnaliseModal.tsx`
- Edge function `stock-fundamentals`; secret `FINNHUB_KEY` (esteve em falta até 12 set 2026)
- Supabase: `dm_fundamentals_cache`, `dm_rate_limits`
- CORS restrito a `https://deskmint.app`
- Sufixo `.US` removido antes de perguntar à Finnhub

## Ligações
- [[03-Decisoes/cache-nao-guarda-falhas]]
- [[04-Bugs/stock-fundamentals-cacheia-null]]
- [[04-Bugs/sufixo-us-finnhub]]
- [[05-Releases/v1.6.0]]
