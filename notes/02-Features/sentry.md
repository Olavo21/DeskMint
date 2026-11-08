---
tipo: feature
estado: feita
versao: 1.6.0
criado: 2026-09-12
---
# Monitorização de erros (Sentry)

## Objetivo
Saber de erros em produção e mostrar um ecrã amigável em vez de um crash.

## Comportamento esperado
- `ErrorBoundary` mostra "Algo correu mal" em erros de render
- Handler global apanha o resto (provado a 30 set 2026)
- `release`/`dist` lidos de `Constants.expoConfig`; `environment` vem de `Updates.channel` (`preview` ou `production`)
- Rodapé das Definições mostra `versão (versionCode) · canal`

## Notas técnicas
- Ficheiros: `lib/sentry.ts`, `lib/appInfo.ts`
- Receção confirmada desde o build 13
- `ErrorBoundary` ainda por testar a sério: precisa de um `throw` durante o render (não num `onPress`), num build `preview`

## Ligações
- [[03-Decisoes/sentry-auto-upload-desligado]]
- [[04-Bugs/sentry-source-maps]]
- [[05-Releases/v1.6.0]]
