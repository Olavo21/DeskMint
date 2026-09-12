const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// NOTA (13 set 2026): withSentryConfig (@sentry/react-native/metro) foi
// removido daqui — ver AGENTS.md secção "Sentry" para o porquê. Isto NÃO
// desliga o Sentry: Sentry.init/ErrorBoundary em app/_layout.tsx e
// lib/sentry.ts continuam ativos e continuam a capturar erros em
// produção. Só perde a injeção automática de debug-id/source-map no
// bundle (stack traces no dashboard ficam minificados em vez de
// legíveis) até isso ser reconfigurado.
module.exports = withNativeWind(config, { input: './global.css' })
