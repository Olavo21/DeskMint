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

## Sentry (12 set 2026)

`@sentry/react-native` instalado e ligado (`lib/sentry.ts`, `components/
ErrorBoundary.tsx`, `app/_layout.tsx`, `metro.config.js`). Conta e projeto
"DeskMint" já criados em sentry.io (12 set 2026) — `EXPO_PUBLIC_SENTRY_DSN`
está definido em `.env.local` e como env var `production` no EAS
(`eas env:set production --name EXPO_PUBLIC_SENTRY_DSN --visibility
sensitive`). `lib/sentry.ts` só ativa (`enabled: true`) quando há DSN **e**
a build é de produção (`NODE_ENV === 'production'`) — continua sempre
desligado em `expo start` local, mesmo com o DSN preenchido. Ainda não
testado contra o dashboard real (precisa de build de produção — ver nota
sobre o LogBox mais abaixo); confirmar lá o primeiro evento antes de
assumir que chega.

- `npx expo install @sentry/react-native` já adicionou sozinho o config
  plugin a `app.json` (`"plugins": [..., "@sentry/react-native"]`) — não
  corri o `npx @sentry/wizard`, porque ele exige login interativo numa
  conta sentry.io que ainda não existe. O wizard só traria mais-valia
  para configurar `organization`/`project` (necessário para os source
  maps subirem nos builds EAS) — isso fica como passo manual.
- **Duas gerações de comando deprecadas, não só uma.** `eas secret:create`
  (o que foi pedido inicialmente) está deprecated a favor de `eas env` —
  mas `eas env:create` **também** está deprecated a favor de `eas
  env:set` (só se descobre ao correr o comando, não está óbvio de fora).
  O comando certo, hoje, testado e a funcionar:
  `eas env:set production --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>
  --visibility sensitive --non-interactive` (falta o `--visibility` dá
  erro em modo não-interativo). Já criado só em `production` — repetir
  para `preview`/`development` se for preciso testar lá também.
  `eas env:list --environment production` mostra o que já lá está.
- **Testar o `ErrorBoundary` num build de dev não mostra o ecrã amigável.**
  Em modo `__DEV__`, o LogBox do React Native intercepta sempre primeiro
  qualquer erro não apanhado (o ecrã vermelho "Uncaught Error" com stack
  trace) — isto acontece *antes* do `Sentry.ErrorBoundary` conseguir
  mostrar o fallback, mesmo com tudo bem ligado. Não é bug de config. Para
  ver mesmo o ecrã "Algo correu mal" é preciso um build de produção (ou
  desligar o LogBox). Confirmado a testar no emulador: o erro apareceu
  como redbox do RN e não como o fallback custom.
- O botão de teste "throw new Error(...)" pedido no passo de validação
  foi usado uma vez e removido — não ficou no código (deliberado, para não
  deixar código morto/de teste em produção). Se for preciso testar outra
  vez, replicar temporariamente num ecrã, nunca commitar.
- **`withSentryConfig` em `metro.config.js` partiu o primeiro build de
  produção (13 set 2026).** Build `1e6c6b49...` falhou na fase
  `EAGER_BUNDLE` com `TypeError: Cannot read properties of undefined
  (reading 'match')` dentro de
  `@sentry/react-native/dist/js/tools/utils.js:determineDebugIdFromBundleSource`,
  logo a seguir ao aviso `Missing config for organization, project.` —
  exatamente o passo manual do wizard que tinha ficado por fazer (ver
  acima). Não há confirmação de que configurar `organization`/`project`
  resolveria (seria preciso login em sentry.io para obter os slugs) e
  não valia a pena arriscar isso em cima da hora de um lançamento.
  **Correção aplicada:** removido o `withSentryConfig(...)` de
  `metro.config.js` — voltou a ser só
  `withNativeWind(getDefaultConfig(__dirname), {...})`. Isto **não**
  desliga o Sentry: `Sentry.init`/`ErrorBoundary` continuam ativos e
  continuam a capturar erros em produção, só deixa de haver
  debug-id/source-map automático no bundle (stack traces no dashboard
  sentry.io ficam minificados/ilegíveis em vez de apontar para o
  ficheiro/linha original). Versão instalada é `@sentry/react-native
  7.11.0`; a última no npm é `8.26.0` (major bump) — não tentado agora,
  API pode ter mudado (`Sentry.init`, `ErrorBoundary`), fica para sessão
  dedicada. Para reativar `withSentryConfig` no futuro: fazer login em
  sentry.io, obter `organization`/`project` slugs (ou correr `npx
  @sentry/wizard -i reactNative -p android` interativo), escrever
  `sentry.properties` ou passar essas opções a `withSentryConfig`, testar
  um build de produção completo antes de assumir que está resolvido.
- **Segundo problema, mesma causa raiz, sítio diferente: `sentry.gradle`
  (13 set 2026).** Corrigir o Metro só resolveu o primeiro crash. O build
  seguinte (`b16104d4...`) passou o bundling e chegou à fase `RUN_GRADLEW`,
  mas falhou lá: o plugin nativo Android do Sentry (injetado sozinho pelo
  config plugin `@sentry/react-native` do `app.json` no `android/app/
  build.gradle` gerado no prebuild — este projeto é managed/CNG, `android/`
  não está commitado, ver `.gitignore`) corre uma task separada
  (`createBundleReleaseJsAndAssets_SentryUpload...`) que também tenta subir
  source maps via `sentry-cli`, e falha com `error: An organization ID or
  slug is required (provide with --org)` — o mesmo problema de
  organization/project em falta, mas apanhado pelo Gradle em vez do Metro.
  **Correção:** `eas env:set production --name SENTRY_DISABLE_AUTO_UPLOAD
  --value true --visibility plaintext --non-interactive` — variável lida
  diretamente pelo `sentry.gradle` (`System.getenv('SENTRY_DISABLE_AUTO_UPLOAD')
  != 'true'` controla `shouldSentryAutoUploadGeneral()`), não precisa de
  prefixo `EXPO_PUBLIC_` porque só é lida em tempo de build pelo Gradle,
  nunca pelo JS em runtime. Continua a não afetar a captura de erros em
  runtime — só a task de upload de source maps é saltada. Quando a
  configuração `organization`/`project` for feita a sério (ver ponto
  acima), reverter isto (apagar a env var ou pôr a `false`) para os
  source maps voltarem a subir automaticamente.

## Auditoria de segurança pré-lançamento (12 set 2026)

- **Rate limiting em `stock-fundamentals`**: duas tabelas novas,
  `dm_fundamentals_cache` (5 min por user+ticker) e `dm_rate_limits`
  (contador por user+endpoint+hora, máx. 20), RLS `auth.uid() = user_id`
  igual ao resto da BD. Um cache-hit não conta para o limite — só conta o
  que realmente vai à Finnhub. **Confirmado ao vivo** (12 set, depois de
  corrigir o FINNHUB_KEY e o sufixo `.US`): 1º toque em "Auto" criou uma
  linha em cada tabela (NVDA.US, dados reais da NVIDIA Corp); 2º toque
  imediato não criou linhas novas (mesmo `created_at`) — a cache travou a
  chamada repetida à Finnhub sem consumir quota. Nota para a próxima vez
  que for preciso mexer no `FundamentalsModal` no emulador: o botão "Auto"
  fica visualmente atrás do overlay "Perf Monitor" do dev client, mas
  continua clicável — usar `adb shell uiautomator dump` para apanhar as
  bounds exatas do `TextView` "Auto" em vez de adivinhar por screenshot.
- **`FINNHUB_KEY` não estava em `supabase secrets list` — corrigido** (12
  set): definido com `npx supabase secrets set FINNHUB_KEY=<a mesma
  chave de EXPO_PUBLIC_FINNHUB_KEY em .env.local>`. Isto explica por que
  "Análise" nunca funcionou em produção — não era bug das alterações
  desta sessão, era falta de secret desde sempre.
- **`.env.local` e as env vars de produção no EAS têm os mesmos valores**
  (Supabase URL/anon key/Finnhub key) — não há projeto Supabase separado
  para dev/staging, só o de produção. Não é um bug introduzido agora, mas
  significa que testar localmente (`expo start`) lê/escreve na mesma BD
  real. Continuar a ter cuidado extra antes de qualquer escrita ao testar.
- **CORS wildcard (`*`) continua nas outras 4 edge functions**
  (`ai-assistant`, `investment-agent`, `investment-chat`,
  `sync-trading212`) — só `stock-fundamentals` foi restrita a
  `https://deskmint.app`, porque foi o único pedido explicitamente. Se for
  para aplicar o mesmo às outras, replicar o mesmo padrão.
- **`sync-trading212` tinha 2 pontos a devolver `error.message` do
  Postgres diretamente ao cliente** (upsert de ligação e de ativos) — 
  corrigido para mensagem genérica + `console.error` só no lado do
  servidor, mesmo padrão do `stock-fundamentals`.
- **`ticker.US` não era limpo antes de perguntar à Finnhub em
  `stock-fundamentals` — corrigido** (12 set): mesma regra
  `.endsWith('.US')` de `toYahooSymbol()` em `lib/yahooFinance.ts`, agora
  como `finnhubSymbol` local — o `ticker` original (com sufixo) continua
  a ser a chave da cache/rate-limit, só o pedido à Finnhub muda. Bug
  pré-existente (não desta sessão), confirmado ao vivo depois da correção:
  NVDA.US → "NVIDIA Corp", P/E 27.48, ROE 110.11, etc., todos reais.
- **`npm audit`**: 0 critical, 23 high, 20 moderate, 2 low. A maioria é
  toolchain de build (metro/react-native/prisma), não código que corre em
  produção — não vale a pena `--force` (arriscaria downgrades do Expo).
  Exceção: `xlsx` (usado em `lib/xtbParser.ts` para importar ficheiros
  reais do utilizador) tem 2 CVEs sem fix disponível a montante
  (prototype pollution + ReDoS) — é o único caso com superfície de ataque
  real (ficheiro Excel controlado pelo utilizador); não há package.json
  fix, só trocar de biblioteca resolveria. **Decisão (12 set): adiado
  para uma sessão dedicada só a isto** — superfície de ataque contida
  (só ficheiros que o próprio utilizador carrega), sem correção simples
  via npm (implicaria trocar para outra biblioteca como `exceljs`, não
  um patch), e o parser XTB já levou várias rondas de correções (ver
  histórico) — mexer outra vez sem tempo dedicado arrisca reintroduzir
  bugs de parsing já resolvidos. Não fazer isto à pressa antes de um
  lançamento.
- **`npx expo-doctor`**: peer deps em falta corrigidas (`expo-constants`,
  `expo-linking`, `react-native-worklets`). Avisos de schema
  (`newArchEnabled`/`jsEngine` mal colocados, ícone não quadrado) e de
  upgrade para SDK 57 (regressão conhecida do Hermes V1) ficaram só
  reportados — nenhuma das duas é segura de mudar dias antes de um
  lançamento.
- Validação de inputs reforçada em `NovaComissaoModal.tsx`,
  `LotsModal.tsx`, `ThresholdsModal.tsx` e `NovoAtivoModal.tsx`: limites
  máximos em valores monetários/quantidades, 0-100% em tetos,
  `maxLength` em texto livre, ticker sempre capado a 10 caracteres.
