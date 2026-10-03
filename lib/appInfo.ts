import Constants from 'expo-constants'
import * as Updates from 'expo-updates'

// Fonte única da identidade do build, lida em runtime e nunca escrita à mão,
// para não ficar desatualizada no primeiro bump. Usada pelo Sentry (release/dist)
// e pelo rodapé das Definições.
const appConfig = Constants.expoConfig

export const bundleId    = appConfig?.android?.package ?? 'com.deskmint.app'
export const appVersion  = appConfig?.version ?? 'unknown'
export const versionCode = appConfig?.android?.versionCode

// Canal do EAS do perfil que gerou o build ('production', 'preview'...). Não se usa
// NODE_ENV porque é 'production' tanto no preview como no production. É null em
// dev client e Expo Go.
export const buildChannel = Updates.channel || 'dev'

export const releaseName = `${bundleId}@${appVersion}+${versionCode ?? 'unknown'}`
