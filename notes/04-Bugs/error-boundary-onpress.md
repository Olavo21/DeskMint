---
tipo: bug
estado: aberto
sentry: 
criado: 2026-09-30
---
# ErrorBoundary não apanha erros de event handlers

**Como reproduzir:** `throw` dentro de um `onPress`/`onLongPress`.
**Esperado vs. atual:** esperado o ecrã "Algo correu mal"; atual a app morre e reinicia (`mechanism: onerror`, `level: fatal` no Sentry).
**Causa:** error boundaries só apanham erros de render, ciclo de vida e construtores.
**Correção:** para testar o boundary, um toque liga um estado e o componente faz `throw` no render seguinte — num build `preview`. O ecrã escuro de crash parece-se com o fallback: não confundir.

Ligações: [[02-Features/sentry]]
