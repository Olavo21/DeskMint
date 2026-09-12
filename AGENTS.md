# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Decisões de Arquitetura

## Rendimento fixo (dm_income) lê sempre a linha mais recente

`hooks/useFixedBudget.ts` (usado pelo card "Orçamento Fixo" da Dashboard)
não filtra `dm_income` por mês/ano — ordena por `year desc, month desc` e
usa a primeira linha. Isto foi deliberado: a tabela continua desenhada
como mensal (mesma forma usada por `useIncome.ts`/Orçamento), mas ler
sempre "o último valor alguma vez registado" evita que o rendimento
apareça a zero quando o mês civil muda sem o utilizador o reeditar —
esse era o comportamento antigo e a queixa original que motivou o
redesign da Dashboard (commit "remodelação Dashboard: orçamento fixo").

Trade-off aceite: se o rendimento mudar a meio do ano (aumento, mudança
de emprego), o histórico mensal anterior deixa de ser reconstruível a
partir da Dashboard — só existe o valor mais recente. Para um único
utilizador isto é aceitável. Antes de abrir a utilizadores reais,
reavaliar: manter histórico mensal implica ou (a) mostrar sempre o valor
do mês corrente com fallback explícito para o último conhecido, ou
(b) separar "rendimento fixo atual" (uma tabela sem noção de mês) de
"histórico de rendimento" como conceitos distintos.

O mesmo padrão ("última linha", sem filtro de mês/ano) foi aplicado à
query de `dm_income` em `hooks/useDashboard.ts` — usado pela linha
"Conta à Ordem" da Dashboard, por `creditos.tsx` e por `SimuladorFIRE.tsx`.
Sem isto, essa linha mostrava saldo negativo todos os meses em que o
utilizador não tivesse reeditado o rendimento (rendimento a 0€ do mês
corrente menos despesas fixas reais, que já não dependem do mês).

## Despesas fixas ligadas a créditos

`dm_recurring_expenses.credit_id` (nullable, FK para `dm_credits`, `ON DELETE
SET NULL`) — mesmo padrão que `dm_assets.credit_id` já usava para a dívida
dos bens ativos. Quando uma despesa fixa está ligada a um crédito (ex: a
prestação do carro), o valor mostrado em `useExpenses.ts`, `useDashboard.ts`
e `useFixedBudget.ts` é sempre `dm_credits.monthly_payment` do crédito, não
o `amount` guardado na própria despesa — evita ter de editar o valor em dois
sítios sempre que a prestação muda. Não existe UI para ligar/desligar esta
relação (ao contrário dos bens ativos, que têm os pills "Vincular a" no
`AssetRow`) — foi ligado diretamente na base de dados para o crédito do
Peugeot 208 GT. Se for preciso ligar outro crédito a outra despesa fixa,
replicar o mesmo padrão manualmente ou construir a UI de ligação.

## Migração de dados (22 ago 2026)

As despesas fixas reais de um utilizador existente estavam presas em
`dm_expenses` (`is_fixed=true`, mês de origem) e nunca tinham sido
copiadas para `dm_recurring_expenses` quando essa tabela foi introduzida
(commit "despesas fixas persistentes via dm_recurring_expenses", 11 ago).
Foram copiadas manualmente (não movidas — os registos antigos em
`dm_expenses` foram mantidos, apenas deixaram de ser lidos por qualquer
ecrã atual). Se noutra conta as despesas fixas aparecerem a 0€ apesar de
existirem em `dm_expenses`, é o mesmo problema de migração incompleta.

## Dados de mercado: Finnhub vs Yahoo — o que cada uma dá e o que não dá

Testado diretamente contra as APIs em 12 set 2026, antes de construir o
`StockDetailModal` e o `TickerBar`. Não redescobrir isto a tentar — ir
direto às conclusões abaixo.

**Finnhub** (`EXPO_PUBLIC_FINNHUB_KEY`, plano grátis — já integrada em
`useTickerSearch.ts`, `lib/newsApi.ts`, `stock-fundamentals` edge function):
- `/quote` (preço atual + `dp` variação %) — funciona bem, CORS aberto
  (`Access-Control-Allow-Origin: *`), por isso funciona também na build Web.
- `/company-news` (notícias por símbolo) — funciona bem, é a fonte usada
  pelo `StockDetailModal`. Por vezes o campo `source` devolvido é "Yahoo"
  (a Finnhub agrega de várias origens) — não é um bug, não confundir com
  usar a API da Yahoo diretamente.
- `/stock/candle` (histórico OHLC) — **bloqueado no plano grátis**:
  devolve `{"error":"You don't have access to this resource."}`. Sem
  histórico não há sparkline nem gráfico por período. Isto é o motivo de
  se ter ido buscar histórico à Yahoo (ver abaixo) em vez de ficar tudo
  numa única fonte.

**Yahoo Finance** (endpoints públicos não-oficiais, sem chave —
`lib/yahooFinance.ts`, usado só para histórico/gráfico):
- `/v8/finance/chart/{symbol}` — funciona sem autenticação, dá histórico
  intraday e de longo prazo (`range`/`interval`), mais preço atual, volume,
  bolsa e nome no bloco `meta` — mas sem Market Cap. É a única fonte de
  histórico grátis encontrada.
- Símbolos: usar o ticker tal como está em `dm_portfolio_assets.ticker`
  (o sufixo ".DE" etc. já bate certo com a Yahoo) — **exceto ".US"**, que
  a Yahoo não usa; tirar esse sufixo antes de pedir (`NVDA.US` falha,
  `NVDA` funciona). `toYahooSymbol()` em `lib/yahooFinance.ts` já faz isto.
- `/v7/finance/quote` e `/v10/finance/quoteSummary` (preço em tempo real
  "oficial", Market Cap, fundamentais) — **deixaram de funcionar sem
  sessão**: devolvem 401 "Invalid Crumb" / "Unauthorized" desde que a
  Yahoo passou a exigir um crumb obtido por cookie de sessão. Não vale a
  pena tentar sem implementar esse fluxo (frágil, pode voltar a mudar).
  É por isto que o header do `StockDetailModal` não mostra Market Cap.
- `/v1/finance/search?...&newsCount=N` também devolve um array `news[]`
  funcional sem chave — não é usado (preferida a Finnhub, mais estável),
  mas fica registado como alternativa se a Finnhub alguma vez for
  descontinuada.
- **Não tem cabeçalhos CORS.** Qualquer chamada a `query1.finance.yahoo.com`
  funciona em iOS/Android mas falha sempre na build Web (bloqueio do
  browser, não da rede). Se algum dia for preciso na Web, a solução é um
  proxy — uma Supabase Edge Function como a `stock-fundamentals` já
  existente — nunca chamar diretamente do browser.
- É uma API não-documentada/não-suportada oficialmente — pode mudar ou
  bloquear pedidos sem aviso. Tratar como best-effort, nunca como fonte
  única para algo crítico.
