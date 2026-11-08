---
tipo: decisao
data: 2026-09-17
---
# Dependências nativas com versão exata

**Contexto:** `react-native-reanimated` com `^4.3.1` derivou localmente para 4.6.0, incompatível com `worklets` 0.8.3, e crashou o ecrã Investimentos. Produção não foi afetada (o lockfile dos builds tinha 4.3.1).
**Decisão:** pacotes com módulo nativo (`reanimated`, `worklets`, `gesture-handler`, `svg`, `screens`, `safe-area-context`…) ficam sempre com versão exata, sem `^`/`~`.
**Alternativas consideradas:** subir o `worklets` para 0.12.x — mudança nativa desnecessária.
**Consequências:** antes de tratar um crash de dependência como incidente, comparar com o `package-lock.json` do commit do build real.
