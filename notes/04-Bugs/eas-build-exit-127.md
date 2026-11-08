---
tipo: bug
estado: aberto
sentry: 
criado: 2026-10-03
---
# Build EAS: exit 127 não diz se o build foi criado

**Como reproduzir:** disparar `eas build` a partir desta máquina.
**Esperado vs. atual:** o processo sai com 127 — no build 13 o build tinha sido criado; no build 15 não.
**Causa:** ambiente local; o código de saída não é fiável.
**Correção:** confirmar sempre com `eas build:list --platform android --limit 2`. Em processos em background, usar caminho absoluto.
