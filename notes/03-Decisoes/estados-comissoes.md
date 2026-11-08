---
tipo: decisao
data: 2026-10-02
---
# Comissões: quatro estados e um helper de invalidação

**Contexto:** `TO_PAY` foi acrescentado ao enum depois de `PENDING/PAID/CANCELLED` e os relatórios continuaram a pensar em dois estados — mostravam "tudo pago" com 12 € por receber. Os mutadores também não invalidavam os relatórios.
**Decisão:** agregações só via `groupByType()` em `lib/commissions.ts`, com os quatro estados explícitos. Mutações chamam `invalidateCommissionQueries(qc)`, com as chaves num único sítio (`COMMISSION_DEPENDENT_QUERY_KEYS`). `CANCELLED`: decisão adiada entre criar a transição na UI ou remover a leitura no calendário.
**Alternativas consideradas:** repetir as chaves nos quatro `onSuccess`.
**Consequências:** invariante — nenhuma comissão entra no `count` de um grupo sem entrar no dinheiro. Uma futura tool de comissões do assistente tem de usar `groupByType()`.

Ligações: [[02-Features/comissoes]], [[04-Bugs/comissoes-quatro-estados]]
