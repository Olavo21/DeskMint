---
tipo: feature
estado: feita
versao: 1.0.0
criado: 2026-07-15
---
# Investimentos — Portfólio

## Objetivo
Gerir posições de investimento (ações, ETFs, cripto), ver alocação, histórico de valorização e ligar brokers.

## Comportamento esperado
- CRUD de ativos em `dm_portfolio_assets` (id é `TEXT`, não UUID — gerado pela app)
- Histórico de preços via Yahoo Finance `/v8/finance/chart/` — sem CORS, não funciona na build Web
- TickerBar no topo com cotações em tempo real via Finnhub `/quote`
- Alocação por tipo com gráfico de barras
- Ligação a brokers: Trading212 via `sync-trading212` Edge Function (key encriptada AES-256-GCM)

## Notas técnicas
- Ficheiros: `app/(tabs)/investimentos.tsx`, `hooks/usePortfolio.ts`, `hooks/usePortfolioHistory.ts`, `lib/yahooFinance.ts`
- `dm_portfolio_assets.id` é `text` (não `uuid`) — confirmar sempre antes de escrever funções Postgres
- Sufixo `.US` removido em `toYahooSymbol()` antes de pedir à Yahoo

## Ligações
- [[02-Features/ticker-bar]]
- [[02-Features/lotes-irs]]
- [[02-Features/look-through-etf]]
- [[02-Features/alertas-teto]]
- [[02-Features/analise-fundamentalista]]
- [[03-Decisoes/finnhub-proxy-pendente]]
- [[04-Bugs/yahoo-crumb-cors]]
