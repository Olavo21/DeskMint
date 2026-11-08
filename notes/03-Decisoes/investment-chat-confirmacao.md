---
tipo: decisao
data: 2026-09-17
---
# Escritas do assistente exigem confirmação no ecrã

**Contexto:** com `confirmAction` como caminho separado do loop do modelo, o payload de escrita pode vir direto do cliente, sem o modelo o ter proposto.
**Decisão:** `update_asset_value` e `add_transaction` só propõem; a escrita acontece quando o utilizador toca Confirmar, validada no servidor. O system prompt proíbe propor escritas não pedidas na mensagem atual; dados de tools são inertes (`<tool_data>`).
**Alternativas consideradas:** escrever direto durante o loop, como antes.
**Consequências:** nova fronteira de confiança — nada se escreve sem o utilizador ver exatamente o que muda.

Ligações: [[02-Features/assistente-srmint]], [[03-Decisoes/idempotencia-escritas]]
