---
tipo: decisao
data: 2026-09-17
---
# Nunca testar escritas contra a conta real do dono

**Contexto:** um teste do `confirmAction` escreveu na carteira real (`VWCE.DE` 1970,11 € → 2009,51 €) sem pedido explícito.
**Decisão:** escritas do agente testam-se num utilizador de teste (`tester@deskmint.app`). Para fluxos de escrita da app, o agente prepara os passos e o utilizador percorre-os pela UI. `SELECT` de diagnóstico filtra sempre por `user_id`.
**Alternativas consideradas:** escrever direto na BD "e apagar a seguir".
**Consequências:** um `INSERT` direto salta o código sob teste — não testa nada, mesmo com risco zero. Ler dados reais para diagnóstico é aceitável.

Ligações: [[02-Features/assistente-srmint]]
