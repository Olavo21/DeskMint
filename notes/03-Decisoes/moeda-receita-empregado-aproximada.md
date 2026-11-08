---
tipo: decisao
data: 2026-11-08
---
# Receita/Emp. em USD com rótulo € até à 1.7.0

**Contexto:** ao corrigir as chaves da Finnhub no `stock-fundamentals` ([[04-Bugs/fundamentals-chaves-finnhub-erradas]]), a Receita/Emp. passou a vir preenchida, mas em USD (a Finnhub dá-a em milhões de USD). O `FundamentalsModal` e `lib/fundamentalsMetrics.ts` mostram-na com `unit: '€'` e textos em €.
**Decisão:** fica a aproximação. A função devolve o valor em USD, em unidades (× 1 000 000), e o rótulo continua a dizer € até à 1.7.0. Na 1.7.0 o rótulo passa a "$".
**Alternativas consideradas:**
- *Converter USD→EUR na função:* implicava mais uma chamada externa, por causa de um rótulo.
- *Mudar já o rótulo:* vive na app, por isso obrigava a um build. A 1.7.0 já vai ter build por causa do [[02-Features/finnhub-proxy]].
**Consequências:** o valor mostrado está ~8% acima do real em euros. O semáforo quase não muda, porque os limites são 1 000 000 e 200 000. Os textos "€1M/emp.", "€200K" e "€6M/emp. da Nvidia" em `lib/fundamentalsMetrics.ts` mudam junto com o rótulo.

Ligações: [[02-Features/analise-fundamentalista]], [[02-Features/finnhub-proxy]]
