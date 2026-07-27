import AsyncStorage from '@react-native-async-storage/async-storage'

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'AOA'

export interface CurrencyConfig {
  code: SupportedCurrency
  symbol: string
  label: string
  locale: string
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  EUR: { code: 'EUR', symbol: '€',   label: 'Euro (EUR)',              locale: 'pt-PT' },
  USD: { code: 'USD', symbol: '$',   label: 'US Dollar (USD)',         locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£',  label: 'British Pound (GBP)',     locale: 'en-GB' },
  CHF: { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc (CHF)',       locale: 'de-CH' },
  AOA: { code: 'AOA', symbol: 'Kz',  label: 'Kwanza Angolano (AOA)',   locale: 'pt-AO' },
}

const CURRENCY_KEY = '@deskmint_user_currency'

export const getSavedCurrency = async (): Promise<SupportedCurrency> => {
  try {
    const saved = await AsyncStorage.getItem(CURRENCY_KEY)
    if (saved && saved in CURRENCIES) return saved as SupportedCurrency
  } catch {}
  return 'EUR'
}

export const saveUserCurrency = async (currency: SupportedCurrency): Promise<void> => {
  try {
    await AsyncStorage.setItem(CURRENCY_KEY, currency)
  } catch (e) {
    console.error('saveUserCurrency error', e)
  }
}

export const formatCurrency = (
  value: number,
  currencyCode: SupportedCurrency = 'EUR',
  decimals = 2,
): string => {
  const config = CURRENCIES[currencyCode] ?? CURRENCIES.EUR
  try {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  } catch {
    return `${value.toFixed(decimals)} ${config.symbol}`
  }
}

export const formatCurrency0 = (value: number, currency: SupportedCurrency = 'EUR') =>
  formatCurrency(value, currency, 0)
