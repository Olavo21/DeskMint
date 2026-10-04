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

**Regra descoberta em 18 set 2026, ao analisar o APK do build `preview`:**
`hooks/useTickerBarQuotes.ts`, `lib/newsApi.ts` e `hooks/useTickerSearch.ts`
chamam a Finnhub diretamente do cliente com `EXPO_PUBLIC_FINNHUB_KEY` —
uma variável `EXPO_PUBLIC_*` é compilada para texto literal no bundle
JS e fica **sempre extraível de qualquer APK publicado** (confirmado:
extraída em segundos). Isto por si só seria só "chave gratuita
exposta" — mas o `FINNHUB_KEY` do servidor (`stock-fundamentals`,
`investment-chat`) foi definido a 12 set com **o mesmo valor**, o que
transforma isto num ponto único de falha: quem abusar da chave
extraída do APK esgota a quota da Finnhub para a chave que também
protege a análise fundamental e o assistente de investimentos — para
todos os utilizadores reais, não só para quem a extraiu.
**Correção a esta regra (23 set 2026), depois de ver o dashboard real
da Finnhub:** a solução óbvia — "duas chaves distintas, uma pública
para o cliente e uma privada para o servidor" — **não é aplicável a
este provedor**. O plano gratuito da Finnhub dá **uma única chave por
conta**: no dashboard existe só um botão **Regenerate** (que invalida
a antiga no instante em que cria a nova), não há forma de criar uma
segunda chave em paralelo, não há estatísticas de uso (nem pedidos/
hora, nem histórico — não dá para detetar abuso pelo painel) e não há
restrição por IP ou domínio. Confirmado diretamente no dashboard, não
inferido da documentação.

**Regra daqui para a frente, para a Finnhub**: zero chaves da Finnhub
no cliente. Como não pode haver uma chave pública separada, a única
configuração segura é a chave existir **só** em `Deno.env` e todas as
chamadas do cliente passarem por um proxy no servidor (edge function,
com cache por endpoint). Enquanto os 3 pontos de chamada do cliente
(`hooks/useTickerBarQuotes.ts`, `lib/newsApi.ts`,
`hooks/useTickerSearch.ts`) não estiverem migrados, a chave continua
exposta em qualquer APK publicado e não há nada a fazer quanto a isso.

**Regra geral, essa mantém-se**: uma variável `EXPO_PUBLIC_*` é pública
por definição — nunca pode ter o mesmo valor que um secret de servidor.
Quando o provedor permitir duas chaves, usar duas (uma pública, capada
nos limites do provedor; uma privada, só em `Deno.env`). Quando não
permitir — como a Finnhub — a alternativa não é "partilhar a mesma", é
tirar a chave do cliente por completo.

**Ordem da rotação (decidida em 23 set 2026, ainda por executar):**
regenerar a chave é **atómico e total** — parte ao mesmo tempo os 5
pontos de chamada (3 no cliente, 2 no servidor), e os do cliente leem
a chave compilada no APK, por isso qualquer versão já instalada perde
ticker bar, notícias e pesquisa de tickers até o utilizador atualizar.
Por isso a regeneração fica para o **fim** da migração do proxy, nunca
antes: primeiro migram-se os 3 pontos do cliente, publica-se essa
release, **espera-se alguns dias** para os utilizadores instalarem, e
só depois se carrega em Regenerate. Regenerar no mesmo instante em que
a release sai deixaria de fora toda a gente que ainda não atualizou —
exatamente o mesmo estrago que se está a tentar evitar. Regenerar
antes da migração seria pior ainda: partiria a app publicada para
depois a voltar a partir na migração, e a chave nova voltaria a ficar
embebida no APK seguinte, sem ganho nenhum.

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

## Achados sobre as chamadas Finnhub do servidor (23 set 2026) — por corrigir

Levantados ao verificar se um 429 sustentado da Finnhub seria detetável
(o dashboard da Finnhub não dá estatísticas de uso — ver secção acima).
Registados como achados; **sem plano de correção associado** — fica por
decidir se entram isoladamente ou só na sessão do proxy.

**1. `stock-fundamentals` não verifica `res.ok` e cacheia o resultado
nulo.** As três chamadas (`stock/metric`, `profile2`, `quote`) vão
direto a `.json()` sem olhar ao status. Num 429 — ou timeout, ou
qualquer hiccup de rede — a Finnhub devolve um corpo JSON de erro,
`metricData.metric` fica `undefined`, `m = {}`, e todos os campos caem
nos `?? null`. A função devolve **HTTP 200 com um resultado inteiramente
a `null`**, e a seguir grava-o em `dm_fundamentals_cache`. O caminho de
leitura da cache serve `cached.response` tal como está durante o TTL,
sem validar nada (confirmado: só compara `created_at` contra
`CACHE_TTL_MS`) — por isso uma falha transitória de um segundo fica
presa **5 minutos garantidos** por user+ticker, e as tentativas nesse
intervalo nem chegam a ir à Finnhub. Para o utilizador, o ecrã vazio é
indistinguível de "este ticker não tem cobertura" — olha para a análise
fundamental em branco e conclui que a app não suporta o ativo dele.
**Isto acontece hoje, na v1.6.0 publicada, sem precisar de ninguém
abusar da chave — basta a Finnhub ter um mau minuto.**

**2. `getMarketData` (investment-chat) colapsa 429 e "sem cobertura" no
mesmo `{ disponivel: false }`.** São estados diferentes com a mesma
representação, e o `{ disponivel: false }` é o estado *normal e
esperado* dos ETFs `.DE` no plano gratuito — está escrito na descrição
da própria tool. O modelo não tem como distinguir "não consigo
consultar agora" de "não tenho este ativo", que são conselhos
diferentes para quem está a decidir uma compra. É a mesma ambiguidade
que custou tempo no incidente do VWCE: quando o valor apareceu errado,
não havia forma de saber se a tool tinha devolvido alguma coisa.

**3. Nenhum dos 5 caminhos Finnhub reporta ao Sentry.** `stock-
fundamentals` não tem integração Sentry nenhuma. Na `investment-chat`,
o `reportToSentry` existe mas está ligado só a três sítios —
`confirmAction`, `initial_call` e `loop` — todos caminhos de exceção da
API da Anthropic; nenhum caminho Finnhub lhe toca. O único sítio onde o
status sobrevive é o `getNews`, que devolve `{ erro: "Erro Finnhub:
<status>" }` — mas isso vai para o modelo como `tool_result`, não para
o Sentry, e só é visível nos logs da função no dashboard do Supabase.
Sem stats do lado da Finnhub e sem isto, um 429 sustentado não tem
sinal nenhum.

## Estados das comissões: migração do TO_PAY que ficou a meio (23 set 2026)

`dm_commission_status` tem **quatro** valores. A ordem real do enum no
Postgres conta a história: `PENDING, PAID, CANCELLED, TO_PAY` — o
`TO_PAY` foi acrescentado por `ALTER TYPE` depois dos outros três, e os
hooks de relatórios ficaram a raciocinar num mundo de dois estados.

Significado, tal como a UI de `comissoes.tsx` o define: `PENDING` é
serviço efetuado à espera de validação do pagador; `TO_PAY` é validado,
à espera da transferência. **`TO_PAY` é dinheiro a receber**, e mais
certo de entrar do que `PENDING`.

Bugs que isto causou, todos corrigidos nesta data em `useReports.ts` /
`relatorios.tsx`:
- `usePendingByType` filtrava só `PENDING`. Com a base real da conta do dono (8 `PAID`,
  1 `TO_PAY`, 0 `PENDING` — números corrigidos a 3 out, ver nota no fim desta secção) o ecrã mostrava "🎉 Nenhuma comissão
  pendente — Tudo pago e em dia!" com 12 € por receber. Não era um
  número desviado, era uma conclusão errada.
- O card "Comissões por Serviço" só somava `PAID` e `PENDING`: uma
  comissão `TO_PAY` entrava no `count` do grupo sem aparecer em nenhuma
  coluna de dinheiro.
- A aba Semana tinha o mesmo buraco nos dois cartões, e rotulava
  qualquer não-`PAID` como "⏳ Pendente".

A correção central é `lib/commissions.ts` → `groupByType()`, partilhada
pelos dois hooks, com os quatro estados tratados explicitamente.
**Invariante a manter**: nenhuma comissão pode entrar no `count` de um
grupo sem aparecer no dinheiro desse grupo.

**Correção de 3 out 2026 aos números desta secção e da dos Relatórios.**
As consultas de diagnóstico foram feitas pela ligação direta ao Postgres,
que ignora o RLS, e **não filtravam por utilizador**. Há outras contas de
teste na BD, e uma delas tinha uma comissão de 37 € (a única sem tipo, de
junho) que entrou em todas as somas. Ficaram contaminados os totais
("171 €" em vez dos 134 € da conta do dono), as contagens do bug acima, os
"42 dias" de junho e a "comissão sem tipo" da análise de composição. **As
conclusões mantêm-se:** os 12 € em `TO_PAY` eram do dono, a mudança de
ritmo de pagamento a partir de julho continua lá, e um Tour continua a
valer cerca de 3,4 Táxis. O erro foi apanhado porque a app mostrava 134 €
e o número esperado era 171 €. A app estava certa e a verificação estava
errada. **Regra:** qualquer `SELECT` de diagnóstico filtra por `user_id`.

### `CANCELLED`: estado inatingível com consumidor já escrito

- **Zero linhas desde sempre** (confirmado por `SELECT` à BD de
  produção, 23 set 2026). Nunca foi usado.
- **Não há nenhuma transição para lá na UI.** `comissoes.tsx` só
  oferece `PENDING → TO_PAY → PAID` (e `TO_PAY → PENDING`). O tipo de
  `updateStatus` em `useCommissions.ts` aceita `'CANCELLED'`, mas nada
  o chama com esse valor.
- **Mas já existe UI a lê-lo**: `CommissionsCalendar.tsx` marca os dias
  com comissões canceladas e tem legenda "Cancelada". Código morto de
  facto, com aparência de funcionalidade.
- Duas hipóteses não resolvidas: ou a transição existiu e desapareceu
  numa reescrita, ou o calendário foi escrito em antecipação e a
  transição nunca chegou. **Decisão adiada**: implementar a transição
  (plausível — um serviço que o cliente desmarca) ou remover a leitura.
  A infraestrutura de leitura já lá está se for para avançar.

### Três definições do enum, duas estavam desatualizadas

`dm_commission_status` estava declarado em três sítios independentes e
só o gerado do Supabase estava certo. Alinhados a 23 set 2026:
- `types/database.ts` — já tinha os quatro (fonte gerada, correta).
- `prisma/schema.prisma` — tinha três, faltava `TO_PAY`. O Prisma não
  está no caminho de execução da app (fala-se com o Supabase via
  `supabase-js`), por isso não partia nada, mas era fonte de verdade
  divergente.
- `types/index.ts` — tinha três. É usada só pela interface `Commission`
  do mesmo ficheiro, que não é importada em lado nenhum (tipo morto).

Se um quarto estado voltar a ser acrescentado, são estes três ficheiros
a atualizar, mais `lib/commissions.ts`.

### Aviso para quem der uma tool de comissões ao assistente

Verificado a 23 set 2026: **nada no lado do servidor lê `dm_commissions`**
— nem as edge functions, nem os 6 cards do ecrã Assistente. Só
`hooks/useReports.ts` e `hooks/useCommissions.ts`. O system prompt do
`investment-chat` diz explicitamente ao modelo que não tem ferramenta de
comissões e que deve recusar estimar em vez de inventar.

Quando essa tool for criada — e é plausível que seja — **usar
`groupByType()` de `lib/commissions.ts`, nunca somas ad-hoc**. Um
`.eq('status', 'PAID')` ou um `filter(c => c.status === 'PENDING')`
escrito de raiz reintroduz exatamente o buraco do `TO_PAY` descrito
acima, e numa camada onde é bastante pior: o prompt endurecido protege
contra o modelo *inventar* dados, mas não protege contra a tool lhe
*entregar* somas erradas. O modelo apresentaria o número errado com toda
a confiança, e o utilizador não tem como o auditar.

O mesmo raciocínio vale para qualquer agregação futura sobre comissões
em `dm_agent_usage` ou `dm_confirmed_actions`: as tabelas nasceram
depois do quarto estado e estão certas, mas quem escrever a query de
agregação pode não saber que existem quatro estados e não três.

## Invalidação em falta nos mutadores de comissões (1 out 2026) — corrigida (2 out) e validada no build 15 (3 out)

**Os quatro mutadores de `hooks/useCommissions.ts` (`create`, `update`,
`updateStatus`, `remove`) invalidam apenas `['commissions']` e
`['dashboard']`.** Nenhum toca nas três queries dos Relatórios:
`['pending-by-type']`, `['monthly-report']` e `['weekly-report']`.

Dois agravantes que tornam o sintoma confuso:

- **`staleTime` global de 5 minutos** (`lib/queryClient.ts`). Sair do ecrã
  e voltar **não** refaz a query — o React Query serve a cache porque os
  dados ainda são considerados frescos. O sintoma não é "preciso de sair
  e voltar", é "não atualiza de todo".
- **`usePendingByType` tem `refetchInterval: 60_000`**, que dispara
  independentemente do `staleTime`. Essa aba **cura-se sozinha ao fim de
  um minuto**, o que faz a falha parecer intermitente e leva a desconfiar
  do código errado. (O `refetchInterval` só corre enquanto a query tem
  observadores — fora do ecrã, não conta tempo.)

**Confirmado ao vivo no build 14** (1 out 2026): criada uma comissão de
99 € e avançada para `TO_PAY` pela UI; os três ecrãs concordaram
(Relatórios/Pendentes, Relatórios/Semana e Comissões, todos 99 €).
Apagada a seguir pela UI, **os 99 € permaneceram em todos os campos dos
Relatórios**, enquanto o `SELECT` à base de dados confirmava zero linhas
e o ecrã de Comissões voltava a 0 € de imediato. Ou seja: o `DELETE` é
real (não há soft-delete — a tabela não tem `deleted_at` e o único
trigger é de `UPDATE`), o que ficou para trás foi exclusivamente cache.

**Correção a fazer: um helper partilhado, não repetir as chaves nos
quatro `onSuccess`.** Esta falha nasceu precisamente de haver quatro
sítios — quando o `useReports` foi criado, era preciso lembrar-se de ir
a quatro `onSuccess` noutro ficheiro, e ninguém se lembrou. Repetir as
chaves corrige o sintoma e deixa a causa intacta: o próximo hook que
dependa de comissões falha da mesma maneira. A lista completa do que
hoje depende de `dm_commissions`, para o helper nascer certo:
`commissions`, `dashboard`, `pending-by-type`, `monthly-report`,
`weekly-report` — cinco chaves, um sítio.

Bug pré-existente, não introduzido pelas correções do `TO_PAY`.

**Nota de 2 out, mais tarde no mesmo dia:** com a reestruturação dos
Relatórios (secção seguinte), `pending-by-type` e `weekly-report` deixaram
de existir e entrou `all-time-report`. A lista ficou com quatro chaves:
`commissions`, `dashboard`, `monthly-report`, `all-time-report`.

**Corrigido a 2 out 2026** com `invalidateCommissionQueries(qc)` e a lista
`COMMISSION_DEPENDENT_QUERY_KEYS` em `lib/commissions.ts`. Os quatro
`onSuccess` de `useCommissions` chamam agora só o helper. A
`invalidateQueries` faz correspondência por prefixo, por isso
`['monthly-report']` apanha `['monthly-report', mês, ano, uid]`.

Achado ao fazer a lista: **a Dashboard não lê comissões** — nem o
`useDashboard` nem o `index.tsx` lhes tocam; os únicos leitores de
`dm_commissions` são `useCommissions` e `useReports`. A chave
`dashboard` fica na lista porque já era invalidada antes, e está anotada
como tal para a lista não afirmar uma dependência que não existe.

**Validado no build 15 (3 out 2026)**, com o mesmo teste que provou a
falha: comissão de 10 € criada e validada pela UI, e apagada a seguir.
A aba Mês de outubro passou de 0 € para 10 € em "A receber deste mês"
logo depois de validar, e voltou a 0 € logo depois de apagar, sem esperar
nem fechar a app. É a volta para 0 € que prova a invalidação: o valor em
cache era 10 €, e uma cache velha teria ficado presa nele.

**Atenção para quem repetir este teste:** voltar ao valor *inicial* não
prova nada. Se a cache ficasse presa, mostraria exatamente esse valor
inicial. A prova está no valor que estava em cache *a seguir à última
mutação*. O "Desde sempre" (`all-time-report`) não foi visto a mudar, mas
passa pelo mesmo ciclo do helper, e um teste com a biblioteca
`@tanstack/query-core` instalada confirmou que a chave
`['all-time-report']` apanha `['all-time-report', uid]`.

## Relatórios: abas reduzidas, e "Desde sempre" é um placeholder (2 out 2026)

**Ler isto primeiro: a questão do "Desde sempre" NÃO ficou resolvida —
foi adiada com uma casca à volta.** A aba existe, mas hoje mostra um único
total que o ecrã de Comissões já permitia obter (é a soma dos três
totalizadores de lá; enquanto tudo estiver pago, é literalmente o número
de "Pagas"). **Nenhuma das quatro vistas de período longo discutidas —
tendência, composição, sazonalidade, velocidade de pagamento — está
implementada.** Ficam à espera de volume de dados (detalhe mais abaixo).
Não descrever isto como "Relatórios reestruturados".

As abas **Pendentes** e **Semana** foram removidas. O que a Pendentes
mostrava (por validar / validadas) já existe nos totalizadores do ecrã
Comissões; a Semana não tinha equivalente, mas a decisão foi reduzir.
Com elas saíram `usePendingByType` e `useWeeklyReport` do
`useReports.ts`.

**"Desde sempre" é um único número, por decisão:** o total de comissões
**faturadas** — pagas, validadas e por validar, excluindo só
`CANCELLED`. Não o total recebido, porque esse já existe: é exatamente o
totalizador "Pagas" do ecrã Comissões, e ficaria duplicado. Calculado
com `groupByType()`, não com uma soma à mão, para o `CANCELLED` sair pelo
mesmo sítio que sai em todo o lado.

**O que se perdeu com as abas removidas** (o código está no commit
`584467e`, se for preciso recuperá-lo):
- **Semana**: totais semanais (Recebido / Por receber) e a lista de
  comissões individuais da semana. **Nenhum dos dois existe noutro sítio**
  — o calendário das Comissões filtra por um dia, não por semana. Era a
  vista útil para quem trabalha ao dia. Atenção se voltar: filtrava por
  `earned_at` (data de registo), pelo que uma comissão registada dias
  depois do serviço caía na semana errada. Tem de filtrar por
  `service_date`.
- **Pendentes**: perdeu-se só o agrupamento do dinheiro por receber por
  tipo de serviço. O resto (validadas / por validar, marca "Atrasada")
  existe no ecrã de Comissões.

Duas escolhas de pormenor:
- O rótulo diz **"Comissões faturadas"** e não "Total faturado", porque o
  herói da aba Mês ("Este mês já faturaste") **inclui o salário**. Sem a
  palavra "comissões", os dois números pareceriam medir a mesma coisa.
- Em erro **não mostra 0,00 €**. Um zero por falha de rede seria uma
  conclusão errada — a mesma classe do "tudo pago e em dia".

Foram consideradas e **adiadas** outras vistas de período longo, com os
dados reais da conta do dono a 2 out (9 comissões em 4 meses): *tendência* (ruído a este
volume — um Tour de 40 € faz um mês parecer crescimento), *sazonalidade*
(precisa de pelo menos dois anos), *composição por valor* (sinal real: um
Tour vale 3,4 Táxis em média) e *velocidade de pagamento* (sinal mais
forte: comissões de junho levaram 30–31 dias a pagar, desde julho nunca
mais de 9). Ficam como ideias para quando houver volume.

### "Média dias a receber" media o intervalo errado — corrigido a 3 out 2026

O KPI da aba Mês calcula `earned_at → paid_at`. Mas o `earned_at` **não é
a data do serviço — é a data em que a comissão foi inserida na app**.
Prova nos dados: o Tour de 40 € foi pago a 10 set e registado a 12 set,
dando **−2 dias**. O KPI mede "tempo a registar + tempo a pagar" e pode
sair negativo. A base certa é `service_date`, com recurso ao
`earned_at` só quando está vazio (na conta do dono, só a comissão mais
antiga não o tem). Com `service_date` os valores são todos ≥ 0.

Corrigido a 3 out: `service_date ?? earned_at`, em **dias de calendário**
(não em milissegundos entre um `date` e um `timestamptz`, que dava
desvios de uma hora com o fuso de Lisboa). O `service_date` vem como
`'AAAA-MM-DD'` e é lido como data local — `new Date('AAAA-MM-DD')` sem
hora seria lido como UTC.

## Regra: a `dm_fundamentals_cache` nunca guarda falhas (23 set 2026)

Ao corrigir o `stock-fundamentals` para verificar `res.ok` antes do
`.json()`, surgiu a objeção óbvia: sem cachear a falha, o cliente pode
voltar a tentar de imediato e queimar o limite de 20 chamadas/hora.
Chegou a ser considerado cachear a falha com um TTL muito curto (~30s)
para travar isso.

**Rejeitado, e a razão vale para qualquer cache futura desta app:** a
`dm_fundamentals_cache` guarda o payload de resposta, e o caminho de
leitura serve `cached.response` tal como está durante o TTL, sem
validar nada. Meter lá um marcador de falha obriga a inventar uma forma
de o marcar, a ensinar o leitor a distingui-lo de dados reais, e a
manter dois TTLs — ou seja, volta a pôr **não-dados dentro da estrutura
que existe para guardar dados**, que é exatamente a classe de bug que a
correção elimina, só que com um rastilho mais curto. Se a distinção no
leitor alguma vez falhar, volta-se a servir erros como se fossem dados,
agora com um caminho de código a mais a esconder o problema.

**Solução adotada, que é menos código e não mais:** chamadas falhadas
não contam para o rate limit. O `insert` em `dm_rate_limits` e o
`upsert` da cache acontecem ambos só depois de as três respostas da
Finnhub virem `ok`. O argumento de que "a quota da Finnhub foi
consumida, logo deve contar" não se sustenta: num 429 a quota
partilhada já está esgotada e contar mais uma não protege nada; num 5xx
ou falha de rede não se consumiu valor nenhum. O único efeito real de
contar seria tirar o orçamento ao utilizador por causa de uma avaria
que não é dele.

O que se perde: durante uma avaria prolongada não há travão nenhum às
tentativas. Aceite porque o `handleFetch` do `FundamentalsModal` está
ligado **só** ao `onPress` do botão — não há `useEffect`, retry
automático nem polling. Esgotar 20 chamadas exige vinte toques manuais
numa app visivelmente a dar erro. Se algum dia esse fetch passar a ser
automático, esta decisão tem de ser reavaliada.

## Recuperação de password — fase 1 validada (build 18); fase 2 implementada, por validar

**Atualização de 4 out 2026 — ler isto antes do resto da secção, que
descreve o estado anterior.** O desenho mudou para **código de 6 dígitos**
(`resetPasswordForEmail` + `verifyOtp({ type: 'recovery' })` +
`updateUser({ password })`), que **dispensa o deep link e o Site URL**.

**Fase 1 feita (commit `03cf751`) e validada no build 18:** o
`onAuthStateChange` do `_layout` só encaminha em `INITIAL_SESSION` e
`SIGNED_IN`. O `authStore` ganhou `recovering`, só em memória e a
`false` no arranque. `PASSWORD_RECOVERY` confirma a flag sem encaminhar;
`USER_UPDATED` com a flag ligada limpa-a **e encaminha** (via
`fetchProfile`); `SIGNED_IN` e `SIGNED_OUT` limpam-na sempre. Validado
no telemóvel: rodapé `1.6.0 (18) · production`, terminar sessão e voltar
a entrar chega à Dashboard, e fechar à força e reabrir entra direto.

Factos verificados na fonte instalada (`@supabase/auth-js` 2.106.1):
`verifyOtp` com `type: 'recovery'` grava a sessão e emite **um só**
evento, `PASSWORD_RECOVERY` (nunca `SIGNED_IN`). O `updateUser` emite
`USER_UPDATED` **antes** de devolver o controlo.

**Requisitos da fase 2 que saem disto:**
- Ligar `recovering = true` **antes** do `verifyOtp`. Em erro do
  `verifyOtp`, desligá-la.
- **Nunca limpar a flag antes do `updateUser`**: o encaminhamento final
  depende de ela ainda estar ligada quando o `USER_UPDATED` chega.
- No sucesso o ecrã não mexe em estado local: o `_layout` navega depois
  de um `fetchProfile` assíncrono, e o ecrã ainda está montado nesse
  intervalo. A flag de submissão nunca volta a `false` no caminho feliz
  (o botão fica bloqueado até a navegação acontecer).
- Mensagem igual exista ou não a conta ("se existir, enviámos um
  código"). Limite de tentativas na UI, como experiência e não como
  segurança. Cancelar faz `signOut()`.
- Textos com `t()` nos três idiomas desde o início.
- **Passo manual no dashboard do Supabase:** mudar o template "Reset
  Password" para usar `{{ .Token }}`. Sem isso o email chega com um link
  e o ecrã espera um código que nunca vem.
- Teste: depois de mudar a password, chegar à Dashboard sem reabrir a app.

**Fase 2 implementada a 4 out 2026, sem build:** `app/(auth)/recuperar.tsx`,
com link "Esqueci-me da palavra-passe" no login e textos em `recovery.*`
nos três idiomas. Cumpre os requisitos acima e mais três que saíram dos
limites do Supabase: "Reenviar código" com espera de 60 s (igual ao
intervalo mínimo por utilizador do Supabase), mensagem própria para o
limite de email (por hora, não o "aguarda um minuto" do `friendlyError`
do login) e limite de 8 códigos errados na UI. Depois de um `verifyOtp`
bem-sucedido o código fica gasto, por isso uma password rejeitada
(`same_password`, `weak_password`) só repete o `updateUser`.

**"Mensagem igual exista ou não a conta" — a armadilha do intervalo
(corrigida a 4 out 2026, antes do build).** O Supabase só aplica o
intervalo mínimo por utilizador ("only request this after N seconds") a
contas que **existem**. A primeira versão mostrava-o como erro ("aguarda N
segundos"), e isso revelava pelo ecrã quais emails estão registados: o
cooldown local de 60 s é do ecrã montado, por isso bastava pedir, cancelar,
voltar e pedir outra vez. Esse erro passou a ser tratado como um envio
normal (mensagem genérica, passo do código, espera nos N segundos
indicados), sem repor o contador de tentativas porque não saiu código
novo. A única mensagem de envio própria é a do limite **por hora** do
projeto, que é igual para todos e não revela nada da conta. Por API
direta o intervalo continua a revelar contas, mas isso é comportamento do
Supabase e não da app.

O ramo `PASSWORD_RECOVERY` do `_layout` **não navega** (verificado): só
confirma a flag. O ecrã já está montado quando o evento chega e não perde
o passo nem o estado.

**Configuração do Supabase de que isto depende (dashboard, fora do repo):**
- **Template "Reset Password"** tem de usar `{{ .Token }}` e não
  `{{ .ConfirmationURL }}` (o de omissão). Sem isso o email traz um link
  que não abre nada na app, e o ecrã espera um código que nunca chega.
- **Limite de envio de emails: 2 por hora, para o projeto inteiro**
  (Authentication → Rate Limits, 4 out 2026), partilhado com os emails de
  confirmação de registo. Cada pedido de código num teste gasta um.
- **Verificação de códigos: 30 a cada 5 min, por IP.** É isto que protege
  o código de 6 dígitos contra força bruta; o limite da UI é experiência.
- **Authentication → Sign In / Providers → Email**, valores definidos a 4
  out 2026 e de que a app depende:
  - **Email OTP Expiration = 600 s** (era 3600). O template diz "expira em
    10 minutos": mudar um sem o outro faz o email mentir.
  - **Email OTP Length = 6** (estava a **8**). O ecrã só aceita 6 dígitos
    (`/^d{6}$/`, `maxLength={6}`); com 8 ninguém conseguia escrever o
    código recebido.
  - **Require current password when updating = desligado** (estava
    ligado). Com ele, o Supabase pode pedir a password atual para mudar de
    password — a que a pessoa esqueceu. O único chamador de `updateUser` na
    app é o ecrã de recuperação, por isso hoje esta opção não protegia mais
    nada. **Se um dia houver "mudar password" nas Definições, reavaliar.**
  - **Password requirements = minúsculas, maiúsculas, números e símbolos**
    (mínimo 6). O ecrã de recuperação valida a **mesma regra** no cliente
    (`meetsPasswordRule`) para dizer qual é, em vez do `weak_password`
    genérico. Se a regra mudar no dashboard, muda no código e no texto
    `recovery.passwordRuleHint`. O registo no login tem o mesmo problema e
    ainda não foi tratado: mostra a mensagem crua do Supabase, em inglês.
- **SMTP próprio é pré-requisito para outros utilizadores.** O serviço de
  email por omissão do Supabase tem limites baixos e, segundo as regras
  atuais do Supabase, pode só entregar a membros da equipa do projeto.
  Se for assim, a recuperação funciona para o dono e falha para quem a
  motivou. Para um círculo fechado, Gmail com app password
  (`smtp.gmail.com`, porta 465) chega e não precisa de domínio. A app
  password mete-se diretamente no dashboard, nunca no chat. **Cuidado:**
  ligar o interruptor "Enable custom SMTP" e guardar com os campos vazios
  faz deixar de sair todos os emails de autenticação.

**Lacuna conhecida:** as Definições não permitem mudar a password. Quem
fechar a app a meio da recuperação entra na Dashboard (decisão consciente)
e fica sem forma de escolher a password dentro da app.

Investigado antes de implementar. **Não é "adicionar uma funcionalidade"**
— obriga a mexer no ponto de decisão único do routing da app. Merece uma
sessão limpa.

**1. Não existe deep link handling nenhum.** O `scheme: "deskmint"` está
no `app.json` e `expo-linking`/`expo-router` são dependências, mas um
grep a todo o repo devolve **zero** `Linking.addEventListener`,
`getInitialURL` ou `useURL`. O `lib/supabase.ts` tinha um comentário a
dizer que "deep links são tratados separadamente" — era falso, e foi
corrigido nesta data. Hoje, um link de email abre a app no estado inicial
e o token é ignorado.

**2. O obstáculo real é o `onAuthStateChange`.** Em `app/_layout.tsx`, o
handler **ignora o tipo de evento** (`_event`) e, sempre que aparece uma
sessão, chama `fetchProfile`, que termina em
`router.replace('/(tabs)')` ou `'/(auth)/onboarding'`.

Um link de recuperação do Supabase **cria uma sessão**. Logo, mesmo com o
deep link a funcionar e o ecrã novo construído, o utilizador seria
atirado para a Dashboard antes de ver o campo da nova password. O
Supabase emite o evento `PASSWORD_RECOVERY` exatamente para este caso, e
esse parâmetro está a ser deitado fora. **Ramificar ali é a parte
arriscada**: é o sítio por onde passam todos os logins da app.

**3. O Site URL não resolve.** O fluxo de recuperação do Supabase precisa
de um Site URL e de Redirect URLs válidos. Hoje: o `deskmint.app` está
por confirmar, e o deployment da Vercel está desatualizado (10 ago, 36
commits atrás) **e protegido por SSO**, logo não serve de destino
público. Se o fluxo depender de um URL web que resolva, isso é peça a
tratar **antes**, não durante.

**Por confirmar no dashboard do Supabase** (não é visível a partir do
repo): se o template de email de recuperação está configurado, qual é o
Site URL e quais os Redirect URLs permitidos.

**O que é preciso construir:** handling do deep link, um ecrã novo
(`app/(auth)/nova-password.tsx`) e a ramificação do routing acima.
**Estimativa: uma sessão inteira**, com teste que não se faz no emulador
— precisa de build real, email recebido no telemóvel e link tocado.

## Disparar builds EAS a partir desta máquina (3 out 2026)

**O exit 127 do comando de build não diz se o build foi criado.**
Aconteceu duas vezes com significados opostos:

- **Build 13 (23 set):** o processo saiu com 127 *depois* de "Computed
  project fingerprint" — **o build tinha sido criado** no EAS e compilou
  normalmente.
- **Build 15 (3 out):** saiu com 127 **imediatamente, com output vazio** —
  o processo em segundo plano não encontrou o `npx` no `PATH` e **nada
  chegou ao EAS**. Nenhum erro visível; o build simplesmente não aparece.

**Regra:** depois de disparar, confirmar sempre com
`eas build:list --platform android --limit 2` — nunca pelo código de
saída. E em processos de fundo usar o caminho absoluto:
`"/c/Program Files/nodejs/npx" eas-cli@latest build ...` (em primeiro
plano o `npx` resolve normalmente; o problema é só do ambiente de fundo).

**Tempo de fila, para não alarmar à toa:** a norma desta conta são
**5 segundos**. Há dois casos registados de fila longa — ~1h56m no
versionCode 7 e 1h10m no 13 — e ambos acabaram por compilar sem
problema. Uma fila longa sozinha não é sinal de falha; acima de duas
horas, ver o estado do serviço do EAS.

## Património líquido: dívida subtraída duas vezes (corrigido a 3 out 2026)

O `netWorth` do `useDashboard` era `assetsValue + portfolio + fundo −
totalCreditDebt`. Mas `assetsValue` já desconta o `effectiveDebt` de cada
bem, e num bem ligado a um crédito esse valor é o saldo do próprio
crédito. O crédito do Peugeot saía duas vezes: **24 526,36 € em vez de
25 433,96 €**. Passou a subtrair-se à parte só os créditos **sem** bem
ligado. A lista por baixo do banner (Bens Ativos em bruto + Portfólio +
Fundo − Passivos) soma agora exatamente o total, como se espera de uma
lista que se lê a olho.

**A linha "Conta à Ordem" (941 €) não era um saldo.** Era `rendimento −
despesas` do mês (`availableBalance`), um fluxo. Passou a chamar-se
**"Sobra do mês"** e saiu do cartão do património. O saldo real da conta
à ordem do dono é um **bem** em Bens Ativos (232,58 € a 3 out).

**Consequência no histórico:** a Dashboard grava o património do mês em
`dm_net_worth_snapshots` sempre que carrega (upsert por mês). Os meses
até setembro ficaram gravados com a dupla subtração, e outubro em diante
sem ela, por isso há um degrau na série. Não foram corrigidos, porque não
há registo do saldo do crédito em cada mês passado. Hoje nada lê esta
tabela (o `useNetWorthHistory` não tem consumidor), mas **quem construir
um gráfico de evolução tem de saber que os valores antes de out 2026
estão subestimados pelo saldo do crédito do carro nesse mês.**

Caso que a lista ainda não cobre: um bem com dívida manual (`debt`) sem
crédito ligado. Essa dívida entra no total, mas não aparece na linha
Passivos, por isso a soma a olho deixaria de bater. Hoje nenhum bem do
dono está nesse caso.

## Projeção de longo prazo: capital investido e euros de hoje (3 out 2026)

A projeção da Dashboard partia do `netWorth` inteiro, com o carro (e
qualquer casa) a render 10% ao ano durante 30 anos. E mostrava o valor
nominal como número principal. Com os dados do dono: **1 854 134 €**.

Passou a partir só de **portfólio + fundo de emergência** (6 109 € a 3
out). O número principal passa a ser o valor em **euros de hoje**:
**821 913 €**, com o nominal (1 488 781 €) numa linha por baixo. Das duas
mudanças, a inflação é a que pesa mais.

- **Inflação: 2% ao ano**, a meta do BCE. Está em `INFLATION_RATE` em
  `lib/projection.ts`. É um pressuposto e não uma previsão, e é o mesmo
  para todos os perfis.
- O "valor real" é o nominal final descontado: `final / 1,02^anos`.
- Os mini-KPIs "Total investido" e "Juros ganhos" também estão em euros
  de hoje (corrigido a 3 out, mais tarde no mesmo dia), para os três
  números do cartão estarem na mesma unidade e somarem: 169 105 € +
  652 808 € = 821 913 €. Cada contribuição mensal é descontada pela
  inflação até ao mês em que entra. O capital inicial não é descontado,
  porque já está em euros de hoje.

## Regra Necessidades/Lazer/Poupança: o que a barra do Lazer mede (3 out 2026)

As metas são personalizáveis por perfil (`target_needs/wants/savings` em
`dm_profiles`, via `useBudgetTargets`). O dono usa **50/20/30**, e o título
"Regra 50/20/30" segue a ordem das barras. Atenção a não ler isto como a
clássica 50/30/20.

**A barra "Disponível/Lazer" não é gasto em lazer.** É `desejos gastos +
dinheiro por atribuir` (`lazerAmt = wants_amt + freeCash` no
`useDashboard`). Com 0 € gastos e 341 € por atribuir, ficava a vermelho
por "exceder" a meta de 20% com dinheiro que ninguém gastou. Agora a
barra tem dois segmentos: o gasto, colorido contra a meta, e o por
atribuir, a cinzento neutro. **A cor julga só o gasto.** A soma das três
percentagens continua a dar ~100% do rendimento.

Também corrigido: o teste para não pintar a Poupança comparava o
**rótulo traduzido** (`label !== 'Poupança'`). Com a app em inglês ou
espanhol, a Poupança acima da meta aparecia a vermelho. Passou a usar uma
chave estável (`kind: 'savings'`).

Cada barra tem um marcador na posição da meta, na mesma escala da barra
(100% = rendimento), e o texto "meta X%" por baixo.

## Escritas no Supabase: duas armadilhas que o `tsc` não apanha (3 out 2026)

**1. Uma escrita sem `await` nem `.then()` não envia nada.** O query
builder do `supabase-js` é preguiçoso: o pedido só parte quando alguém
consome a promessa. `supabase.from('x').update({...}).eq(...)` numa linha
solta constrói o pedido e deita-o fora. É exatamente o bug que fazia a
língua e a moeda escolhidas nas Definições nunca chegarem à BD (perfil
preso em `language = 'pt'`), e que o `_layout` depois reaplicava a cada
arranque. O `tsc` não vê nada de errado, porque o código é válido.

**2. O `supabase-js` não rejeita em erros da BD: devolve `{ error }`.** Um
`try/catch` ou um `.catch()` à volta de uma escrita não apanha uma
falha de RLS, de constraint ou de coluna. É preciso olhar para o
`error` do resultado. Um `.then(() => ...)` que ignora o argumento
engole a falha.

**Numa edge function há uma terceira:** trabalho deixado pendente antes
do `return` da resposta não tem garantia de terminar. Os registos de
`dm_agent_usage` e `dm_rate_limits` da `investment-chat` eram
fire-and-forget e passaram a ter `await` (em paralelo, com o `error`
verificado e enviado ao Sentry), porque são os dados de custo por sessão
e o contador do rate limit.

**Deployado a 3 out 2026 e confirmado** (versão descarregada de produção
igual ao `HEAD` `ab5cadc`), **mas ainda não verificado a escrever.** Com
a flag `EXPO_PUBLIC_ENABLE_ASSISTANT` desligada em `production`, nenhum
build da Play chama esta função, e o APK `preview` (que a tem ligada)
entra em conflito de assinatura com a instalação pela Play. A única
verificação possível hoje é negativa: o deploy não partiu nada. **Quando
a flag for ligada num build, o primeiro uso do Assistente tem de ser
seguido de um `SELECT` a `dm_agent_usage` e `dm_rate_limits`, filtrado
pelo utilizador, a confirmar uma linha nova em cada.** É a única prova de
que o `await` está mesmo a escrever.

**Pesquisa feita a 3 out 2026**, com o compilador de TypeScript e não com
grep, porque as cadeias ocupam várias linhas: **61 escritas** (`insert`/
`update`/`upsert`/`delete`) em `app`, `hooks`, `components`, `lib`,
`stores` e nas edge functions. 56 com `await`, 2 dentro de um `await
Promise.all`, 3 fire-and-forget deliberados com `.then()` e **0
soltas** depois da correção. O detetor foi validado contra a versão
anterior à correção do `definicoes.tsx`, onde apanha exatamente as duas
linhas com o bug. Dos 3 fire-and-forget, os 2 da `investment-chat`
passaram a `await` e o terceiro (o snapshot mensal do património na
Dashboard) continua fire-and-forget de propósito, mas passou a verificar
o `error`.

**Em backlog: ESLint com `@typescript-eslint/no-floating-promises`.** O
projeto não tem ESLint de todo. A regra apanharia o bug 1 no editor
(trata as cadeias do Supabase como promessas), mas precisa de lint com
informação de tipos (`typescript-eslint` com o `tsconfig`), custa meia
sessão e vai marcar muito código existente. Adiado porque hoje há zero
casos e o detetor acima está provado. A razão para um dia o fazer: **este
bug passa no `tsc`**, e só aparece quando alguém testa a persistência.

## Língua e moeda: gravação validada, e o que cada seletor significa (4 out 2026)

**A correção da gravação (commit `34c00db`) está validada no build 17,
nos dois sentidos.** Escolhido inglês: a Dashboard mudou logo, e manteve-se
depois de fechar a app à força e reabrir, com `dm_profiles.language =
'en'` na base de dados. Voltando a português e mudando a moeda para USD:
`language = 'pt'` e `currency = 'USD'`. A chave estável da regra também
ficou provada: em inglês, a linha "Savings" acima da meta fica a verde.
No build 16, sem a correção, nada mudava. A falta de gravação explicava
tudo, e não apareceu nenhuma segunda causa.

**Moeda: só muda o símbolo, e isso é o comportamento pretendido.** O `useFmt` passa
o número guardado ao `Intl.NumberFormat` com o código da moeda escolhida,
e não há taxa de câmbio em lado nenhum da app. Os valores do dono estão
em euros: com USD, o património de 25 434 € aparece como `$25,434`, com
AOA como `25 434 Kz` (mil vezes abaixo do real). **Decidido a 4 out 2026 pelo dono:** a app é de uso
pessoal, com valores registados pelo utilizador e não lidos de contas
reais. A "moeda" é portanto **a unidade em que o utilizador regista os
valores**, não uma moeda de apresentação. Não há conversão nem taxas de
câmbio, e não é bug: quem regista em dólares vê dólares. **Não tratar
isto como erro nem acrescentar conversão sem nova decisão.** O cuidado
que fica: mudar de moeda depois de ter registos **não os converte**, só
troca o símbolo. Se um dia isto confundir alguém, a correção é de texto
(dizer no seletor que é a moeda dos registos e que não converte), não de
câmbio.

**Língua: fica, por decisão do dono (4 out 2026). Pendente: a tradução está a meio.** Com inglês escolhido, os textos que
passam por `t()` mudam ("Net Worth", "Net Income", "Long-Term
Projection"...), mas muitos estão escritos à mão em português e ficam:
"Sobra do mês", "Bens Ativos", "Passivos / Créditos", e os nove
separadores da barra inferior (em `app/(tabs)/_layout.tsx`, `title:
'Início'` etc.). Quem escolhe inglês fica com uma app meio traduzida, e a
barra inferior, que está sempre visível, fica toda em português.

## Sentry (12 set 2026)

`@sentry/react-native` instalado e ligado (`lib/sentry.ts`, `components/
ErrorBoundary.tsx`, `app/_layout.tsx`, `metro.config.js`). Conta e projeto
"DeskMint" já criados em sentry.io (12 set 2026) — `EXPO_PUBLIC_SENTRY_DSN`
está definido em `.env.local` e como env var `production` no EAS
(`eas env:set production --name EXPO_PUBLIC_SENTRY_DSN --visibility
sensitive`). `lib/sentry.ts` só ativa (`enabled: true`) quando há DSN **e**
a build é de produção (`NODE_ENV === 'production'`) — continua sempre
desligado em `expo start` local, mesmo com o DSN preenchido.

**Confirmado ao vivo em produção a 30 set 2026** (build 13, canal de
teste interno da Play, Android 14). Deixou de ser suposição: o evento
chegou ao projeto DeskMint com `dist` **13**, `release` **1.6.0 (13)**,
`environment` **production** e `is_embedded_launch: true` (bundle
embebido, não uma atualização OTA). Isto valida de uma vez a captura de
erros em produção **e** a correção manual de `release`/`dist` feita a 18
set em `lib/sentry.ts` — a colisão em que tudo caía indistinguível no
balde `+12` fica resolvida deste build em diante, porque um evento passa
a identificar sem ambiguidade de que build veio.

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
  **Resolvido a 3 out 2026, sem env var nova** (entra no build 17, por
  validar): o `environment` passou a vir de `buildChannel` em
  `lib/appInfo.ts`, que lê `Updates.channel`. O EAS escreve o `channel`
  do perfil (`preview` ou `production`, distintos no `eas.json`) na
  configuração nativa da app, e o valor existe mesmo sem nenhuma
  atualização OTA (o evento do build 13 trazia `channel: production` com
  `is_embedded_launch: true`). O rodapé das Definições mostra o mesmo
  valor. **Teste do 17:** o `environment` do primeiro evento no Sentry tem
  de ser igual ao que o rodapé mostra.
  **Rodapé validado no build 17 (4 out 2026):** mostra literalmente
  `1.6.0 (17) · production`. Prova que o canal vem preenchido num binário
  instalado pela Play, e não cai no recurso `dev`. O `Sentry.init` do
  commit desse build usa `environment: buildChannel`. A confirmação ao
  vivo de um evento com `environment: production` fica para o primeiro
  erro real. Não se repõe nenhum gatilho para isto.

### O `ErrorBoundary` continua por testar — e porque é que a tentativa falhou (30 set 2026)

O gatilho de teste (commit `3c29bcd`, já revertido) fazia `throw` dentro
de um `onLongPress` no rodapé das Definições. **Nunca podia funcionar**, e
é importante perceber porquê antes de alguém repetir o mesmo:

**Um `throw` dentro de um event handler (`onPress`, `onLongPress`, etc.)
nunca chega ao `ErrorBoundary` do React.** Os error boundaries só apanham
erros de *render*, de métodos de ciclo de vida e de construtores — o
handler corre fora do ciclo de render, por isso o erro passa ao lado do
boundary e sobe direto ao handler global do JavaScript.

Confirmado pelos dados do evento no Sentry, não por dedução:
`mechanism: onerror`, `handled: false`, `level: fatal`. Na prática a app
morreu e reiniciou (visível nos breadcrumbs: `Start Time` treze segundos
antes da exceção) em vez de mostrar o ecrã "Algo correu mal". O ecrã
escuro que se vê nesse momento é a app a morrer, não o fallback — e são
quase da mesma cor, o que torna o engano fácil.

**Efeito lateral positivo: ficou provado que o handler global está ativo
e funcional.** É a rede por baixo do boundary — mesmo o que o
`ErrorBoundary` não apanha chega ao Sentry, com `release`/`dist`
corretos. Isso não era garantido e agora é.

**Como testar o boundary a sério, quando se retomar o pendente:** é
preciso um gatilho que rebente **durante o render** — tipicamente um
estado que o toque liga (`setState(true)`) e um `if (flag) throw new
Error(...)` no corpo do componente, que dispara na renderização
seguinte. E deve ser feito num build **`preview`**, não em produção: o
perfil `preview` também é release e também tem `NODE_ENV=production`,
logo o LogBox está desligado e o boundary comporta-se exatamente como em
produção — mas é APK, instala-se direto e não gasta um ciclo da Play.

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

**Segundo motivo, independente do risco (1 out 2026).** A regra acima
está justificada por risco — corromper dados reais. Isso é verdade mas é
frágil: assim que o risco parecer baixo, a regra cede. "É só uma comissão
de 99 € na minha própria conta, e apago-a a seguir" é um argumento
razoável contra a versão só-de-risco.

O segundo motivo não tem essa fraqueza, porque **vale mesmo quando o
risco é zero**: escrever direto na base de dados **salta exatamente o
código que está sob teste**. Um `INSERT` numa tabela não exercita o hook
que lê, a query com os filtros certos, a função que agrega, nem a
renderização do card. Um teste que contorna o caminho sob teste não é um
teste — é uma verificação de que o Postgres aceita linhas.

Corolário prático: quando for preciso exercitar um fluxo de escrita, o
agente prepara os passos e **o utilizador percorre-os pela UI normal da
app**. Não é uma cerimónia de segurança; é a única forma de o resultado
significar alguma coisa. (Exemplo real: validar a correção do `TO_PAY`
exigia criar uma comissão e avançá-la de estado pela app — feito pelo
dono, não pelo agente, precisamente porque o valor do teste está no
caminho percorrido.)

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
