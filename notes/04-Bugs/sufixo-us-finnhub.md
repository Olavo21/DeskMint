---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-09-12
---
# Sufixo .US nos tickers (Finnhub e Yahoo)

**Como reproduzir:** pedir `NVDA.US` à Finnhub ou à Yahoo.
**Esperado vs. atual:** esperado dados da NVIDIA; atual vazio.
**Causa:** `dm_portfolio_assets.ticker` guarda `.US`, que nenhuma das APIs usa. Os outros sufixos (`.DE`…) batem certo com a Yahoo.
**Correção:** `toYahooSymbol()` em `lib/yahooFinance.ts` e `finnhubSymbol` no `stock-fundamentals` tiram o `.US`; o ticker original continua a ser a chave de cache. **Armadilha:** qualquer chamada nova a estas APIs tem de fazer o mesmo.

Ligações: [[02-Features/analise-fundamentalista]], [[02-Features/investimentos-portefolio]]
