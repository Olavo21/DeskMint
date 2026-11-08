---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-10-03
---
# Datas 'AAAA-MM-DD' lidas como UTC

**Como reproduzir:** comparar `new Date('2025-01-15')` com `new Date()` em Lisboa, perto da meia-noite.
**Esperado vs. atual:** esperado diferença em dias de calendário; atual um dia de desvio.
**Causa:** uma data sem hora é lida como meia-noite UTC; `new Date()` é hora local.
**Correção:** comparar duas strings ISO (ambas UTC) ou ler a data como local. Apareceu na média de dias a receber (Relatórios) e no cálculo de isenção IRS (Lotes). **Armadilha** para qualquer cálculo novo com datas.

Ligações: [[02-Features/lotes-irs]], [[02-Features/relatorios]]
