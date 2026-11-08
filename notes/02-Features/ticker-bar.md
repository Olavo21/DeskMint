---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-09-12
---
# TickerBar e StockDetailModal

## Objetivo
Barra de cotações em tempo real no topo do ecrã Investimentos; toque abre detalhe com gráfico e notícias.

## Comportamento esperado
- TickerBar: sparkline intraday + preço + variação % para cada ativo do portfólio
- StockDetailModal: bottom sheet estilo widget — header com preço/variação/volume, gráfico interativo (1D/1S/1M/1A/TUDO) com crosshair, notícias recentes
- Funciona só em iOS/Android — Yahoo Finance sem CORS, falha no browser

## Notas técnicas
- Ficheiros: `hooks/useTickerBarQuotes.ts`, `components/investments/StockDetailModal.tsx`
- Cotações: Finnhub `/quote` (CORS aberto — funciona na Web)
- Histórico: Yahoo `/v8/finance/chart/` (sem CORS — só nativo)
- Notícias: Finnhub `/company-news` (campo `source` pode ser "Yahoo" — normal, agrega de várias origens)
- `EXPO_PUBLIC_FINNHUB_KEY` em `useTickerBarQuotes.ts` está visível no APK — pendente migração para proxy

## Ligações
- [[02-Features/investimentos-portefolio]]
- [[03-Decisoes/finnhub-proxy-pendente]]
- [[04-Bugs/expo-public-finnhub-key]]
- [[04-Bugs/yahoo-crumb-cors]]
