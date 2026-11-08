---
tipo: bug
estado: resolvido
sentry: 
criado: 2026-09-23
---
# Comissões: código que só conhece dois estados

**Como reproduzir:** comissão em `TO_PAY` com um filtro ad-hoc `status === 'PENDING'` ou `.eq('status', 'PAID')`.
**Esperado vs. atual:** esperado contar como dinheiro a receber; atual desaparece ("tudo pago e em dia" com 12 € por receber).
**Causa:** `TO_PAY` entrou no enum depois; código antigo raciocinava com dois estados.
**Correção:** `groupByType()` em `lib/commissions.ts`. **Armadilha:** qualquer agregação nova (incluindo uma futura tool do assistente) tem de usar o helper.

Ligações: [[03-Decisoes/estados-comissoes]], [[02-Features/comissoes]]
