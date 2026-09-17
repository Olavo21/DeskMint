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
- **Consequência descoberta mais tarde (18 set 2026)**: desligar o
  `sentry-cli` também parou o registo automático do `release` nos
  eventos — sem isso, chegavam órfãos, sem versão associada (corrigido
  manualmente em `lib/sentry.ts`, ver `release`/`dist` lidos de
  `Constants.expoConfig`). O outro lado que fica por resolver: **sem
  `sentry-cli` também não há upload de source maps**, por isso os stack
  traces de produção chegam minificados (`index.android.bundle:1:2847`
  em vez do ficheiro/linha reais). Não é urgente enquanto não houver um
  erro real para investigar, mas a correção não precisa de reativar o
  auto-upload (que continua a rebentar sem `organization`/`project`
  configurados) — dá para fazer manualmente depois de cada build, já
  com `release`/`dist` corretos:
  `npx sentry-cli sourcemaps upload --release <releaseName> --dist
  <versionCode> <caminho-do-source-map>`. Fica registado para quando
  for preciso, não fazer antes disso.
- **`release`/`dist` do preview e da produção colidem** (18 set 2026):
  sem `autoIncrement` em nenhum perfil do `eas.json`, o `versionCode`
  vem sempre do `app.json` do repositório — hoje `12`, o mesmo que já
  foi publicado em produção (v1.6.0/versionCode 12, 12 set). Um APK
  `preview` buildado a partir do mesmo commit gera exatamente o mesmo
  `release`/`dist` (`com.deskmint.app@1.6.0+12`) que os utilizadores
  reais da Play — os eventos caem no mesmo balde no Sentry, sem forma
  de separar por `release` quem é teste e quem é produção real. Um
  evento isolado (o teste manual de hoje) é inofensivo porque se sabe
  qual é; mais do que um build `preview` ao longo do tempo torna-os
  indistinguíveis.
  O `environment` também não resolve isto sozinho como está hoje:
  `lib/sentry.ts` usa `environment: process.env.NODE_ENV`, mas
  `NODE_ENV` é `'production'` em **ambos** os perfis `preview` e
  `production` (nenhum tem `developmentClient: true`, por isso o
  Metro empacota os dois em modo produção) — o campo `environment`
  também sai igual nos dois casos.
  Correção correta quando for preciso (não feita agora — build a
  correr, não vale outro ciclo por isto): não mexer no `versionCode`
  para os distinguir — criar uma env var dedicada (ex:
  `EXPO_PUBLIC_SENTRY_ENVIRONMENT`, valor `"preview"` no ambiente EAS
  `preview` e `"production"` no `production`) e usá-la em
  `Sentry.init({ environment: ... })` em vez de `NODE_ENV`. Isso separa
  os eventos no Sentry por ambiente independentemente do `versionCode`
  coincidir.

## Idempotência das escritas do investment-chat (18 set 2026)

Depois do incidente do VWCE (secção seguinte), ficou claro que faltava
proteção contra a mesma escrita ser aplicada duas vezes — duplo-toque,
retry de rede, ou um histórico antigo reaberto com o cartão ainda
visível. Desenho final (não o primeiro tentado — ver porquês abaixo):

- **`actionId` nasce no servidor**, dentro de `proposeUpdateAssetValue`/
  `proposeAddTransaction` (`crypto.randomUUID()`), viaja no cartão até
  ao cliente e volta tal-e-qual em `confirmAction`. Nascer no cliente
  não protegia nada — um replay simplesmente gerava outra chave.
- **`dm_confirmed_actions`** (`action_id uuid PRIMARY KEY, user_id,
  tipo, payload jsonb, consumed_at`) + duas funções Postgres
  (`confirm_update_asset_value`, `confirm_add_transaction`) que fazem o
  `INSERT` do `action_id` **e** a escrita real em `dm_portfolio_assets`
  na mesma transação. Uma chave repetida rebenta a `UNIQUE` constraint
  do `INSERT`, o que aborta a transação inteira (incluindo a escrita
  que viria a seguir) — zero janela de corrida entre dois pedidos
  simultâneos, ao contrário de um desenho "lê, vê se existe, escreve"
  em três passos separados (que foi a primeira versão implementada e
  corrigida antes de chegar a produção).
- **Ambas as funções só são executáveis pelo `service_role`**
  (`REVOKE ALL ... FROM PUBLIC, anon, authenticated`) — sem isto, o
  Supabase expõe automaticamente qualquer função pública em
  `/rest/v1/rpc/<nome>`, e como `p_user_id` é um parâmetro explícito
  (não vem de `auth.uid()`, que seria sempre `null` numa ligação
  service_role), um utilizador autenticado podia chamar a função
  diretamente com o `user_id` de outra pessoa. Confirmado com
  `information_schema.role_routine_grants` que só `postgres`/
  `service_role` têm `EXECUTE`.
- **`update_asset_value` resolve a percentagem num valor absoluto no
  momento da proposta**, não no momento da confirmação — o payload de
  `confirmAction` passou a ser `{ asset_id, new_value }`, nunca
  `{ modification_type, value }`. Reaplicar a mesma proposta duas vezes
  define o mesmo valor absoluto (idempotente por construção); reaplicar
  "+2%" duas vezes teria composto sobre um valor já alterado pela
  primeira chamada. `add_transaction` continua sem este truque — somar
  duas vezes nunca é idempotente por construção — por isso depende
  inteiramente do `actionId`.
- **Armadilha descoberta a testar**: `dm_portfolio_assets.id` é
  `text` na BD real, não `uuid` (gerado pela app, não pelo Postgres,
  apesar de os valores serem UUIDs formatados). As funções foram
  escritas a assumir `p_asset_id uuid` e falhavam com `operator does
  not exist: text = uuid` em qualquer chamada — só apareceu ao testar
  a sério contra a BD, não no `deno check` (que não valida SQL dentro
  de uma string `.rpc()`). Corrigido para `p_asset_id text`. Se outra
  function/RPC vier a comparar `dm_portfolio_assets.id` com um
  parâmetro tipado, confirmar sempre o tipo real da coluna primeiro
  (`information_schema.columns`), não assumir `uuid` só porque o valor
  parece um.
- **Testado ao vivo** (18 set 2026) contra `tester@deskmint.app`
  (utilizador de teste já existente, portefólio fictício com 1 posição
  AAPL — nunca contra a conta real do dono, ver regra seguinte):
  chamada 1 com `actionId` novo aplicou 180€→190€; chamada 2 com o
  **mesmo** `actionId` mas valor diferente (999,99€) falhou com
  `23505` e o valor ficou em 190€ (não 999,99€ nem qualquer estado
  intermédio — a transação reverteu tudo); chamada 3 com `actionId`
  novo aplicou normalmente. Prova direta contra a função Postgres,
  sem depender da UI/emulador (que já se mostrou instável para este
  tipo de teste — ver secção de reposição do chat).
- **Ownership confirmado mesmo com service_role** (18 set 2026,
  revisão pós-implementação): `investment-chat` liga-se com
  `SUPABASE_SERVICE_ROLE_KEY` (RLS não protege nada nessa ligação), mas
  `user.id` vem sempre de `sb.auth.getUser(authHeader)` — verificação
  criptográfica da assinatura do JWT enviado pelo cliente, nunca lido
  do corpo do pedido — e é esse `user.id` verificado que entra como
  `p_user_id` nas duas funções. Dentro delas, todo o `SELECT`/`UPDATE`
  (2 ocorrências em cada função) filtra por `user_id = p_user_id`. É
  exactamente o padrão que faltava na `investment-agent` eliminada
  nesta sessão — service_role sem esta verificação era o problema, não
  o service_role em si.
- **`dm_confirmed_actions` cresce sem limite** — uma linha por escrita
  confirmada, para sempre, sem TTL nem purga automática. Não é urgente
  (o volume esperado é baixo), mas fica registado: se um dia se decidir
  limpar linhas antigas, o corte tem de ser **maior que qualquer tempo
  de vida possível de um cartão pendente no cliente** — hoje isso não
  tem limite formal (o histórico da conversa não é persistido entre
  sessões da app, mas nada impede tecnicamente um cliente manter um
  `pendingAction` em memória por muito tempo antes de o utilizador
  tocar Confirmar). Apagar uma linha de `dm_confirmed_actions` cedo
  demais reabre a janela que esta tabela existe para fechar — um
  cartão "antigo" voltaria a poder ser aplicado.

## Regra: nunca testar escritas do agente contra a conta real do dono (17 set 2026)

Durante os testes do `confirmAction` do `investment-chat` (ver secção
seguinte), o teste do caminho positivo ("proposta + Confirmar") foi
feito por iniciativa própria do agente Claude, sem pedido explícito do
utilizador, e escreveu de facto na carteira real de produção
(`VWCE.DE` alterado de 1970,11€ para 2009,51€ — depois confirmado
como resultado correto de `1970,11 × 1,02`, não um bug, mas mesmo
assim uma escrita real não autorizada). Isto não devia ter acontecido
por dois motivos independentes:

1. Testar o caminho de escrita não devia envolver decidir sozinho
   fazer uma escrita real sem pedir — o mesmo princípio de "nunca
   escrever sem confirmação explícita" que a própria feature impõe ao
   utilizador final devia ter sido aplicado ao próprio processo de
   teste.
2. Mesmo com autorização, testar escritas (`confirmAction`,
   `update_asset_value`, `add_transaction`) contra os dados reais do
   dono da conta é a forma errada de testar — corrompe dados de
   produção reais e obriga a reposição manual depois.

**Regra daqui para a frente**: escritas do agente nunca são testadas
contra a conta real do dono. Criar (ou usar, se já existir) um
utilizador de teste no Supabase com uma carteira fictícia — o RLS já
garante isolamento entre contas, por isso basta mudar de sessão/login
no dev build antes de testar qualquer fluxo que escreva dados. Ler
dados reais para diagnóstico é aceitável; escrever neles para testar
não é.

## Duas decisões da reescrita do investment-chat (17 set 2026) — porquês

**Porque é que update_asset_value/add_transaction ficaram com
confirmação obrigatória, em vez de escrever direto como antes:**
a partir do momento em que o `confirmAction` passou a existir como
caminho separado do loop do modelo (decisão técnica boa — determinístico,
mais barato, sem depender do modelo "decidir" corretamente todas as
vezes), o payload de escrita passou a poder vir diretamente do cliente,
contornando o modelo por completo. Isso só é seguro se nada for escrito
sem o utilizador ver exatamente o que vai mudar e confirmar — caso
contrário o cliente podia, por bug ou má-fé, mandar qualquer `asset_id`/
valor direto para `executeUpdateAssetValue` sem o modelo alguma vez ter
proposto aquilo. A confirmação no ecrã não é sobre desconfiar do
modelo — é sobre o facto de o modelo deixar de ser o único a decidir
o que se escreve, o que exige uma fronteira de confiança nova. Sem
isto, a validação server-side (ownership, formato, limites) continuaria
a proteger de escrita noutra conta, mas não de o próprio utilizador
disparar sem querer uma escrita errada através de um payload manipulado
ou de um bug de UI.

**Porque é que a investment-agent foi eliminada em vez de mantida em
paralelo:** a spec original pedia para implementar num ficheiro chamado
`investment-agent`. Descobriu-se a meio que esse ficheiro já existia
(órfão, zero chamadas no cliente) e que a função realmente em produção
era outra (`investment-chat`, ligada a `useInvestmentChat`). Manter as
duas — aplicar a spec nova à `investment-agent` e deixar a
`investment-chat` como estava — criaria dois sistemas de IA paralelos
a fazerem a mesma coisa, um deles sem UI nenhuma a apontar-lhe, exatamente
o género de duplicação que já tinha acontecido duas vezes antes
nesta app (ver secção seguinte: o chat já mudou de function 2 vezes —
`investment-chat` original em jun, `investment-agent` em jul, de volta
a zero em ago). Cada vez que isso aconteceu, ficou código morto para
trás. Decisão: só deve existir *uma* function de chat de investimentos
de cada vez — aplicar a spec à que está realmente em uso, apagar a
outra por completo (ficheiro local e deploy no Supabase), nunca deixar
as duas vivas "por precaução".

## Reposição do chat do Assistente (17 set 2026)

O chat LLM do portefólio (`InvestmentChatSheet`/`useInvestmentChat`/
`investment-chat`) tinha sido cortado da UI **duas vezes** antes de hoje,
e ninguém tinha percebido isto ao pedir a reescrita da function — o
trabalho de hoje quase ficou "pronto mas inacessível" por engano. Histórico
completo, reconstruído do git log (as mensagens de commit não dizem
"porquê", só "o quê" — o raciocínio abaixo é inferência a partir do que
mudou, não uma certeza):

1. **12 jun** (`0a15220`): `InvestmentChatSheet` nasce como FAB
   (`sparkles-outline`) em `investimentos.tsx`, a chamar `investment-chat`.
2. **27 jul** (`eda2110`, "AI assistant overhaul"): o FAB e o
   `InvestmentChatSheet` saem de `investimentos.tsx`; o chat muda-se para
   `assistente.tsx`, mas a chamar uma function **diferente**,
   `investment-agent` (a mesma que foi apagada nesta sessão como código
   morto — ou seja, chegou a estar viva uns 40 dias).
3. **1 ago** (`0178188`, "substituir chat LLM por 6 cards analíticos"):
   `assistente.tsx` perde o chat outra vez, agora substituído pelos 6
   cards estáticos atuais (Total/Tops/Alocação/Projeção/Imposto/Objetivo,
   calculados no cliente). A mensagem do commit destaca explicitamente
   "**zero chamadas à API**" como característica do redesign — o sinal
   mais próximo de motivo que existe no histórico. Aponta para
   custo/fiabilidade da API, não para qualidade das respostas, mas isto
   é leitura do commit, não confirmação do autor. `InvestmentChatSheet.tsx`
   não foi mutilado neste commit (só um refactor cosmético de formatação
   de moeda) — ficou intacto, só órfão.

**Decisão de hoje**: repor o chat, mas não como antes — como camada
adicional sobre os 6 cards, nunca como substituto, e atrás de uma flag:

- `EXPO_PUBLIC_ENABLE_ASSISTANT` (lida em `app/(tabs)/assistente.tsx`),
  **desligada por defeito**. Sem a flag a `true`, o ecrã Assistente fica
  bit-a-bit igual ao que está em produção hoje — nem o botão aparece, nem
  `InvestmentChatSheet` chega a montar (não só o botão fica escondido; o
  componente inteiro só é renderizado condicionalmente, para não correr
  `useInvestmentChat` de todo em quem não tem a flag).
- Entrada posta em `assistente.tsx` (ícone `sparkles-outline` no
  `rightElement` do `Header`), **não em `investimentos.tsx`** — ali havia
  outro bug ativo no momento desta decisão (crash do `react-native-
  worklets`/`reanimated`, ver secção acima) que teria bloqueado
  precisamente o ecrã onde a porta de entrada ficaria, impedindo testar
  o chat mesmo depois de o repor. `investimentos.tsx` já não tem ligação
  nenhuma ao chat desde 27 jul; manter assim.
- Não copiar `EXPO_PUBLIC_ENABLE_ASSISTANT=true` para as env vars de
  produção no EAS sem decisão explícita — primeiro corre com a flag
  ligada só em builds internos/dev, mede o custo real por sessão em
  `dm_agent_usage`, e só depois decide expor ao público. É exactamente
  o motivo de a flag existir em vez de repor o botão visível a todos de
  imediato.

## Dependências com código nativo — sempre versão exata, nunca `^`/`~` (17 set 2026)

**Regra**: `react-native-reanimated`, `react-native-worklets`,
`react-native-gesture-handler`, `react-native-svg`, `react-native-screens`
e `react-native-safe-area-context` (e qualquer outro pacote com módulo
nativo compilado, não só JS puro) ficam sempre pinados a uma versão
exata no `package.json` — nunca `^4.3.1`, sempre `4.3.1`. Estes pacotes
vêm aos pares/grupos com compatibilidade estrita entre si (ex:
reanimated 4.x exige worklets 0.12.x+, mas 4.3.x ainda aceita 0.8.x —
a tabela exata está no `compatibility.json` do próprio pacote
reanimated); um `npm install` de outra coisa qualquer, mais tarde, pode
resolver o `^4.3.1` para `4.6.0` sem tocar em mais nada visível,
partindo o par sem qualquer alteração intencional.

**Como isto foi descoberto** (17 set 2026): a meio dos testes do
`investment-chat`, o ecrã Investimentos começou a dar "Uncaught Error"
ao abrir — `[Reanimated] Your installed version of Worklets (0.8.3) is
not compatible with installed version of Reanimated (4.6.0)`. O
`package.json` desta app tinha `"react-native-reanimated": "^4.3.1"`
(com caret) e `"react-native-worklets": "0.8.3"` (exato) — o
`node_modules` local tinha resolvido para 4.6.0 sem que o
`package-lock.json` commitado alguma vez tivesse essa versão. Verificado
directamente: `git show <commit-do-build-1.6.0>:package-lock.json` tinha
`reanimated 4.3.1` tanto no build do versionCode 11 como do 12 — ou
seja, **os builds de produção saíram com o par correto**; o `4.6.0` era
deriva exclusiva desta máquina de desenvolvimento (`node_modules`
dessincronizado do lockfile commitado, provavelmente de um `npm
install` anterior nesta sessão que não regenerou tudo). Corrigido
removendo o caret (`"react-native-reanimated": "4.3.1"`) e correndo
`npm install` para realinhar — diff de 2 linhas em `package.json` e
`package-lock.json`, sem efeitos em cascata. Não foi preciso subir a
versão do worklets (evitou-se exactamente o erro de "corrigir subindo
para 0.12.x", que teria sido uma mudança nativa a precisar de rebuild
do dev client — o par 4.3.1/0.8.3 já era compatível, só precisava de
deixar de poder derivar).

**Lição**: nunca assumir que um crash de dependência visto localmente
significa que a produção está partida — comparar sempre o
`package-lock.json` do commit que gerou o build real antes de tratar
isto como incidente. E nunca "corrigir" uma incompatibilidade nativa
subindo a versão maior sem antes verificar se o par já esperado
(mais baixo, já instalado) não estava só a derivar localmente.

## `deno check` nas Edge Functions — fixar a versão do supabase-js (17 set 2026)

Todas as edge functions desta app importam `npm:@supabase/supabase-js`
**sem versão fixa** (`stock-fundamentals`, `sync-trading212`, e o
`investment-chat` antes desta data). Isto tem um efeito prático: o
`deno check` local resolve sempre "latest" no momento em que corre, e a
versão atual do pacote (2.116.0) tem uma inconsistência interna entre o
tipo devolvido por `createClient()` e o que `.from()/.update()` esperam
internamente — qualquer função que passe o cliente Supabase por
fronteira de função (`async function algo(sb: ReturnType<typeof
createClient>, ...)`, o padrão usado em `investment-chat` desde sempre)
dá erros de tipo `SupabaseClient<...> não atribuível a
SupabaseClient<...>` mesmo com o código correto. Confirmado ao testar o
`investment-chat` **antigo, já deployado e a funcionar em produção
desde junho** — dá exatamente a mesma classe de erro, o que prova que
não é uma regressão de código, é o ambiente de checking a ficar
inutilizável à medida que o npm publica novas versões por baixo dos pés.

Adicionalmente, sem um generic `Database` em `createClient()`, `.update()`
e `.insert()` colapsam para aceitar `never` nesta mesma versão 2.116.0 —
outra fonte de falsos "erros" (ou pior: perda silenciosa de verificação
real, já que sem o generic o TypeScript não apanha nomes de coluna
errados).

**Correção aplicada no `investment-chat`** (a replicar nas outras
functions se/quando for preciso confiar no `deno check` delas):
- `import { createClient } from "npm:@supabase/supabase-js@2.45.0"` —
  versão fixa, testada, sem a inconsistência acima.
- `import type { Database } from "../../../types/database.ts"` +
  `createClient<Database>(...)` — usa o schema real do projeto.
- `type SB = ReturnType<typeof createClient<Database>>` (não
  `ReturnType<typeof createClient>` sozinho — sem o generic, o alias
  captura a instanciação por defeito e volta a não bater certo com o
  valor real).
- `types/database.ts` estava incompleto: não tinha `dm_rate_limits` nem
  `dm_agent_usage` (tabelas já usadas por `stock-fundamentals`/
  `investment-chat`) — adicionadas. Ainda falta `dm_fundamentals_cache`
  (usada só pelo `stock-fundamentals`) — não corrigido agora, fora do
  âmbito desta alteração, mas é o mesmo tipo de gap.

Com isto, `deno check supabase/functions/investment-chat/index.ts`
(com `--node-modules-dir=auto` neste repo, por ter `package.json` na
raiz) corre a **zero erros** de forma reprodutível — deixou de ser
"provavelmente bem" para ser verificado.

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
