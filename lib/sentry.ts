// Import só por efeito secundário — chamar Sentry.init() aqui, à parte,
// garante que corre uma única vez, assim que o módulo é importado (no topo
// de app/_layout.tsx), antes de qualquer ecrã montar. Um erro no primeiro
// render só é capturado se o init já tiver corrido nessa altura.
import * as Sentry from '@sentry/react-native'
import Constants from 'expo-constants'

// release/dist manuais (18 set 2026): com withSentryConfig removido do
// metro.config.js e SENTRY_DISABLE_AUTO_UPLOAD=true no Gradle (ver
// AGENTS.md, secção Sentry), o plugin nativo já não regista o release
// sozinho via sentry-cli — sem isto, os eventos chegam sem versão
// nenhuma associada, tornando impossível distinguir "isto é da 1.6.0 ou
// da próxima" (exatamente o que se precisa para validar o fix do
// worklets). Formato igual ao que o sentry-cli usava
// (`com.deskmint.app@<version>+<versionCode>`, dist `<versionCode>`,
// lidos dinamicamente de app.json em runtime — não hardcoded aqui, por
// isso este comentário não fixa um número de exemplo que ficaria
// desatualizado a cada bump de versionCode) para continuidade se o
// upload automático for reativado no futuro.
const appConfig    = Constants.expoConfig
const bundleId     = appConfig?.android?.package ?? 'com.deskmint.app'
const appVersion   = appConfig?.version ?? 'unknown'
const versionCode  = appConfig?.android?.versionCode
const releaseName  = `${bundleId}@${appVersion}+${versionCode ?? 'unknown'}`

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
  release: releaseName,
  dist: versionCode != null ? String(versionCode) : undefined,
  ignoreErrors: [
    'Network request failed',
    'AbortError',
  ],
})
