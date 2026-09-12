// Import só por efeito secundário — chamar Sentry.init() aqui, à parte,
// garante que corre uma única vez, assim que o módulo é importado (no topo
// de app/_layout.tsx), antes de qualquer ecrã montar. Um erro no primeiro
// render só é capturado se o init já tiver corrido nessa altura.
import * as Sentry from '@sentry/react-native'

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
  ignoreErrors: [
    'Network request failed',
    'AbortError',
  ],
})
