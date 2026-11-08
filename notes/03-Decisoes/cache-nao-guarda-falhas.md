---
tipo: decisao
data: 2026-09-23
---
# A cache nunca guarda falhas

**Contexto:** ao corrigir o `stock-fundamentals` para verificar `res.ok`, pôs-se a hipótese de cachear falhas ~30 s para travar retries.
**Decisão:** a `dm_fundamentals_cache` só guarda dados reais. Chamadas falhadas também não contam para o rate limit: o `insert` em `dm_rate_limits` e o `upsert` da cache só acontecem depois das três respostas virem `ok`.
**Alternativas consideradas:** marcador de falha com TTL curto — obrigava o leitor a distinguir não-dados de dados, a mesma classe de bug que se queria eliminar.
**Consequências:** numa avaria longa não há travão a tentativas. Aceite porque o fetch só corre por toque no botão. Se passar a ser automático, reavaliar. Vale para qualquer cache futura.

Ligações: [[02-Features/analise-fundamentalista]], [[04-Bugs/stock-fundamentals-cacheia-null]]
