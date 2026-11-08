---
tipo: bug
estado: aberto
sentry: 
criado: 2026-09-12
---
# Limites do plano grátis da Finnhub

**Como reproduzir:** pedir `/stock/candle` ou dados de ETFs `.DE` (ex.: `VWCE.DE`).
**Esperado vs. atual:** `/stock/candle` devolve "You don't have access to this resource"; ETFs `.DE` vêm sem cobertura (`disponivel: false` no assistente).
**Causa:** limitação do plano gratuito, não da app.
**Correção:** histórico vai à Yahoo (`/v8/finance/chart`). Não há fonte para fundamentais de ETFs europeus. Não redescobrir isto a testar.

Ligações: [[04-Bugs/yahoo-crumb-cors]], [[02-Features/ticker-bar]]
