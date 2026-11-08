---
tipo: bug
estado: aberto
sentry: 
criado: 2026-09-18
---
# Stack traces do Sentry minificados

**Como reproduzir:** ver qualquer evento de produção no Sentry.
**Esperado vs. atual:** esperado ficheiro/linha reais; atual `index.android.bundle:1:2847`.
**Causa:** `SENTRY_DISABLE_AUTO_UPLOAD=true` desliga o upload de source maps.
**Correção:** configurar `organization`/`project` e apagar a env var (com build de teste completo), ou à mão: `npx sentry-cli sourcemaps upload --release <release> --dist <versionCode> <source-map>`. Não urgente até haver um erro real.

Ligações: [[03-Decisoes/sentry-auto-upload-desligado]], [[02-Features/sentry]]
