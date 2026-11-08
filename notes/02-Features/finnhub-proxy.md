---
tipo: feature
estado: planeada
versao: 1.7.0
criado: 2026-11-08
---
# Proxy da Finnhub

## Objetivo
Tirar a chave da Finnhub do APK. Todas as chamadas da app à Finnhub passam por uma edge function, que passa a ser o único sítio onde se trata a cache, os 429 e o reporte ao Sentry.

## Comportamento esperado
- Nenhuma chamada da app vai diretamente a `finnhub.io`. A app chama a edge function com o JWT do utilizador e a função chama a Finnhub com `FINNHUB_KEY` lido de `Deno.env`
- `EXPO_PUBLIC_FINNHUB_KEY` sai do código, do `.env.local` e das env vars do EAS (`preview` e `production`)
- Ticker bar, notícias, pesquisa de tickers e detalhe do ativo continuam a funcionar como hoje
- Um 429 mostra "Limite de pedidos atingido, tenta daqui a pouco", diferente de "sem dados para este ativo" e de um erro genérico — incluindo no `FundamentalsModal`, que hoje mostra a mesma mensagem para tudo

## Endpoints usados hoje pela app
| Endpoint Finnhub | Ficheiro | Quem usa |
|---|---|---|
| `/quote` | `hooks/useTickerBarQuotes.ts` | `components/TickerBar.tsx` (refetch a cada 60 s; cripto como `BINANCE:XXXUSDT`) |
| `/search` | `hooks/useTickerSearch.ts` | `components/investments/NovoAtivoModal.tsx` (debounce 400 ms) |
| `/news?category=` | `lib/newsApi.ts` → `getMarketNews` | `hooks/useMarketNews.ts` → `components/investments/MarketNews.tsx` |
| `/company-news` | `lib/newsApi.ts` → `getCompanyNews`, `getMultiNews`, `getSectorNews`, `getPortfolioNews` | `hooks/useCompanyNews.ts` (StockDetailModal), `hooks/useMarketNews.ts` |

Já no servidor (não mudam de sítio): `stock-fundamentals` (`stock/metric`, `stock/profile2`, `quote`) e `investment-chat` (`quote`, `company-news`).

## Notas técnicas
- Ficheiros/ecrãs afetados: os quatro da tabela; `components/investments/MarketNews.tsx` perde o `HAS_KEY` e o ecrã "Adiciona EXPO_PUBLIC_FINNHUB_KEY"; `components/investments/FundamentalsModal.tsx` (mensagem de 429)
- Supabase: edge function nova (ex.: `market-data`) com lista fechada de endpoints permitidos — nunca um proxy genérico que aceite qualquer caminho
- Autenticação: `auth.getUser()` com o JWT do cliente, igual ao `stock-fundamentals`
- Cache: os dados de mercado não são do utilizador, por isso a cache pode ser partilhada por endpoint + parâmetros. TTL sugerido: quote 60 s, notícias 15 min, pesquisa 24 h. Regra de [[03-Decisoes/cache-nao-guarda-falhas]]: só se guardam respostas `ok`
- Limites: o plano grátis tem uma quota por chave para todos os utilizadores. Limite por utilizador em `dm_rate_limits` e um `/quote` em lote por pedido do ticker bar (hoje é um pedido por ativo a cada 60 s)
- 429 e falhas: reutilizar `supabase/functions/_shared/sentry.ts` (`failureFromStatus`, `failureFromError`, `reportFinnhubFailures`) e `FINNHUB_TIMEOUT_MS`. Nunca logar o URL (leva o token)
- Resposta ao cliente com um estado explícito (`ok` / `sem_cobertura` / `limite_pedidos` / `erro`), igual ao do `investment-chat`
- Sufixos: manter as regras atuais (`.US` sai, cripto passa a `BINANCE:XXXUSDT`) dentro da função — ver [[04-Bugs/sufixo-us-finnhub]]
- CORS: a app nativa não precisa; se a build Web voltar, permitir só `https://deskmint.app`
- **Fora do proxy, mas no mesmo build:** a Receita/Emp. do `FundamentalsModal` passa de € para "$" (`unit` e os textos `good`/`bad`/`example` de `revenuePerEmployee` em `lib/fundamentalsMetrics.ts`). O valor vem da Finnhub em USD. Ver [[03-Decisoes/moeda-receita-empregado-aproximada]]. *Nice to have, não bloqueia:* o campo mostra `7213500.00` (o modal faz `toFixed(2)` a tudo); a linha "≈ 7.2M por empregado" por baixo já o torna legível

## Fora do proxy, no mesmo build: texto do veredito da Análise
Item separado do proxy, com critério de pronto próprio, para uma falha num não ser confundida com uma falha no outro. A regra **não** muda. Ver [[03-Decisoes/veredito-texto-antes-da-regra]].

- **O que faz:** quando há vermelhos, o veredito do `FundamentalsModal` mostra que métricas o impediram de subir. Formato: rótulo do veredito + ` · ` + `label` da métrica + `getLightLabel` em minúsculas (ex.: "Qualidade moderada · Beta muito volátil")
- **Vários vermelhos:** mostrar até dois e depois "+N" (ex.: "· Beta muito volátil, P/E caro +1")
- **Sem vermelhos:** o texto fica igual ao de hoje
- **Ficheiros:** `lib/fundamentalsMetrics.ts` (`computeVerdict` passa a devolver as métricas a vermelho, não só a contagem) e o cartão do veredito no `FundamentalsModal`
- **Tradução:** os textos do veredito e os rótulos dos semáforos estão hoje escritos à mão em português, fora do `t()` (bug em produção: [[04-Bugs/i18n-veredito-semaforos]]). O sufixo novo junta os dois, por isso **as 33 strings (27 rótulos de semáforo + 6 do veredito) passam para o `t()` neste build, nos três idiomas** (confirmado a 8 nov 2026). As fichas de informação e o resto do modal ficam no backlog

**Critérios de pronto (veredito):**
- [ ] NVDA (Beta 2,35, resto como a 8 nov): "Qualidade moderada · Beta muito volátil"
- [ ] Um ticker sem vermelhos mostra o veredito sem sufixo
- [ ] Com três ou mais vermelhos aparecem dois nomes e "+N", e o texto não sai do cartão
- [ ] Os mesmos casos com a app em inglês
- [ ] Em inglês e espanhol, nenhum rótulo de semáforo nem texto do veredito aparece em português
- [ ] O veredito (alta / moderada / fragilidades) é o mesmo de antes para os mesmos valores, porque a regra não mudou

## Rollout
1. Implementar a função e migrar os quatro pontos da app; testar com o utilizador de teste
2. Deploy da função **antes** de publicar o build (a app nova depende dela; a antiga não)
3. Publicar a release 1.7.0
4. Esperar alguns dias pela adoção (ver as versões ativas na Play Console)
5. Só então carregar em **Regenerate** na Finnhub e atualizar o secret `FINNHUB_KEY` no Supabase. Quem ainda tiver a 1.6.0 perde o ticker bar, as notícias e a pesquisa — é o custo aceite
6. Remover `EXPO_PUBLIC_FINNHUB_KEY` do EAS

Decisão e porquê da ordem: [[03-Decisoes/finnhub-proxy-pendente]]. Problema que resolve: [[04-Bugs/expo-public-finnhub-key]].

## Critérios de pronto
- [ ] `grep -r "finnhub.io\|EXPO_PUBLIC_FINNHUB_KEY"` em `app/ components/ hooks/ lib/` sem resultados
- [ ] Bundle de produção sem a chave: `npx expo export --platform android` e procurar no output a chave atual e `finnhub.io` — zero ocorrências
- [ ] `EXPO_PUBLIC_FINNHUB_KEY` removida das env vars do EAS (`eas env:list`)
- [ ] Ticker bar, notícias de mercado, notícias do ativo e pesquisa testados num build `preview`
- [ ] 429 simulado mostra "tenta daqui a pouco" no ticker bar, nas notícias e no `FundamentalsModal`, e chega ao Sentry com `edge_function`, `runtime:edge`, `finnhub_endpoint` e `finnhub_failure:rate_limit`
- [ ] "Sem cobertura" (ex.: `VWCE.DE`) não gera evento no Sentry
- [ ] Cache verificada: duas aberturas seguidas do ticker bar = uma ida à Finnhub
- [ ] Receita/Emp. com "$" no `FundamentalsModal`
- [ ] Chave regenerada depois da adoção, e `stock-fundamentals` / `investment-chat` a funcionar com a nova

## Ligações
- [[03-Decisoes/finnhub-proxy-pendente]]
- [[04-Bugs/expo-public-finnhub-key]]
- [[04-Bugs/stock-fundamentals-cacheia-null]]
- [[02-Features/ticker-bar]]
- [[02-Features/sentry]]
