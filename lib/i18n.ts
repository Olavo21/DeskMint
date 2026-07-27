import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

import pt from '../locales/pt.json'
import en from '../locales/en.json'
import es from '../locales/es.json'

const LANGUAGE_KEY = '@deskmint_user_language'

const getSupportedLanguage = (code: string): 'pt' | 'en' | 'es' => {
  if (code === 'pt' || code === 'en' || code === 'es') return code
  return 'pt'
}

const getInitialLanguage = async (): Promise<'pt' | 'en' | 'es'> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY)
    if (saved) return getSupportedLanguage(saved)
  } catch {}
  const deviceCode = Localization.getLocales()[0]?.languageCode ?? 'pt'
  return getSupportedLanguage(deviceCode)
}

const resources = {
  pt: { translation: pt },
  en: { translation: en },
  es: { translation: es },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'pt',
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
})

getInitialLanguage().then((lang) => {
  if (i18n.language !== lang) i18n.changeLanguage(lang)
})

export const changeAppLanguage = async (language: 'pt' | 'en' | 'es') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language)
    await i18n.changeLanguage(language)
  } catch (e) {
    console.error('changeAppLanguage error', e)
  }
}

export default i18n
