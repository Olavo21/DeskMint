import { create } from 'zustand'

export type Language = 'pt' | 'en' | 'es'
export type Currency = 'EUR' | 'CHF' | 'GBP' | 'USD' | 'AOA'

interface PreferencesState {
  language: Language
  currency: Currency
  tickerBarEnabled: boolean
  setLanguage: (l: Language) => void
  setCurrency: (c: Currency) => void
  setPreferences: (l: Language, c: Currency) => void
  setTickerBarEnabled: (v: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'pt',
  currency: 'EUR',
  tickerBarEnabled: true,
  setLanguage: (language) => set({ language }),
  setCurrency: (currency) => set({ currency }),
  setPreferences: (language, currency) => set({ language, currency }),
  setTickerBarEnabled: (tickerBarEnabled) => set({ tickerBarEnabled }),
}))
