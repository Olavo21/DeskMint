---
tipo: bug
estado: aberto
sentry: 
criado: 2026-09-12
---
# Yahoo Finance: crumb e falta de CORS

**Como reproduzir:** chamar `/v7/finance/quote` ou `/v10/finance/quoteSummary`; ou qualquer endpoint Yahoo a partir da build Web.
**Esperado vs. atual:** v7/v10 dão 401 "Invalid Crumb"; na Web todas as chamadas falham por CORS.
**Causa:** a Yahoo passou a exigir crumb por cookie de sessão; e não envia cabeçalhos CORS. API não oficial, pode mudar sem aviso.
**Correção:** usar só `/v8/finance/chart` (sem auth). Sem Market Cap no `StockDetailModal`. Na Web, só via proxy (edge function). `/v1/finance/search` tem notícias sem chave — alternativa se a Finnhub cair.

Ligações: [[02-Features/ticker-bar]], [[04-Bugs/finnhub-plano-gratis-limites]]
