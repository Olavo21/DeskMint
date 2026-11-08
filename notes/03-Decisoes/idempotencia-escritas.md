---
tipo: decisao
data: 2026-09-18
---
# Idempotência das escritas do assistente (actionId)

**Contexto:** duplo-toque, retry de rede ou um cartão antigo podiam aplicar a mesma escrita duas vezes.
**Decisão:** `actionId` nasce no servidor (`crypto.randomUUID()`) na proposta. `confirm_update_asset_value` / `confirm_add_transaction` fazem o `INSERT` em `dm_confirmed_actions` e a escrita na mesma transação; chave repetida → `23505` → nada escrito. `update_asset_value` resolve a percentagem num valor absoluto na proposta. Funções só executáveis por `service_role`.
**Alternativas consideradas:** `actionId` no cliente (um replay gerava outra chave); "lê, verifica, escreve" em três passos (janela de corrida).
**Consequências:** `dm_confirmed_actions` cresce sem limite. Se um dia se purgar, o corte tem de ser maior que a vida de qualquer cartão pendente.

Ligações: [[03-Decisoes/investment-chat-confirmacao]], [[04-Bugs/portfolio-assets-id-text]]
