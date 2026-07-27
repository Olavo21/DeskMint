import { create } from 'zustand'

export type Language = 'pt' | 'en' | 'es'
export type Currency = 'EUR' | 'CHF' | 'GBP' | 'USD' | 'AOA'

interface PreferencesState {
  language: Language
  currency: Currency
  setLanguage: (l: Language) => void
  setCurrency: (c: Currency) => void
  setPreferences: (l: Language, c: Currency) => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'pt',
  currency: 'EUR',
  setLanguage: (language) => set({ language }),
  setCurrency: (currency) => set({ currency }),
  setPreferences: (language, currency) => set({ language, currency }),
}))
