---
tipo: decisao
data: 2026-09-12
---
# Correção das CVEs do xlsx adiada

**Contexto:** `xlsx` (usado no parser XTB) tem 2 CVEs sem correção (prototype pollution, ReDoS).
**Decisão:** resolver numa sessão dedicada, antes de abrir a app a mais gente — não à pressa antes de um lançamento.
**Alternativas consideradas:** trocar já para `exceljs`.
**Consequências:** superfície contida (só ficheiros do próprio utilizador). O parser já levou várias rondas de correções; mexer sem tempo arrisca reintroduzir bugs.

Ligações: [[04-Bugs/xlsx-cves]], [[02-Features/importacao-xtb]]
