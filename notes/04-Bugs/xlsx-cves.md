---
tipo: bug
estado: aberto
sentry: 
criado: 2026-09-12
---
# xlsx com 2 CVEs sem correção

**Como reproduzir:** `npm audit`.
**Esperado vs. atual:** prototype pollution + ReDoS no `xlsx`, sem fix a montante.
**Causa:** biblioteca usada por `lib/xtbParser.ts` para ler ficheiros do utilizador.
**Correção:** trocar de biblioteca (ex.: `exceljs`) numa sessão dedicada — ver [[03-Decisoes/xlsx-adiado]].

Ligações: [[02-Features/importacao-xtb]]
