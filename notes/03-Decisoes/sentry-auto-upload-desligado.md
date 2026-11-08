---
tipo: decisao
data: 2026-09-18
---
# Upload automático de source maps do Sentry desligado

**Contexto:** o build de produção falhava na task Gradle do Sentry (`An organization ID or slug is required`), por faltarem `organization`/`project`.
**Decisão:** `SENTRY_DISABLE_AUTO_UPLOAD=true` no ambiente EAS `production`. `release`/`dist` passam a ser definidos à mão em `lib/sentry.ts`; `environment` vem de `Updates.channel`.
**Alternativas consideradas:** configurar `organization`/`project` já — exige um build de teste completo.
**Consequências:** stack traces de produção chegam minificados. Para reverter: configurar os slugs e apagar a env var, ou subir os source maps à mão depois de cada build.

Ligações: [[02-Features/sentry]], [[04-Bugs/sentry-source-maps]]
