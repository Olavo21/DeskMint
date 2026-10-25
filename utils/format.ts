import { formatCurrency, formatCurrency0, type SupportedCurrency } from '../lib/currencies'
import { usePreferencesStore } from '../stores/preferencesStore'

// Non-reactive helpers — read currency from Zustand store state directly
export const fmt = (v: number): string =>
  formatCurrency0(v, usePreferencesStore.getState().currency as SupportedCurrency)

export const fmt2 = (v: number): string =>
  formatCurrency(v, usePreferencesStore.getState().currency as SupportedCurrency)

export const pct = (v: number): string =>
  `${(v * 100).toFixed(1)}%`

// Percentagem já em pontos percentuais (3 = 3%), formatada para a língua dada e
// sem o símbolo. Só para mostrar: 0.28 * 100 dá 28.000000000000004 em vírgula
// flutuante, e interpolado diretamente num texto aparecia assim no ecrã.
export const formatPct = (valuePct: number, language: string, minDecimals = 0, maxDecimals = 2): string =>
  valuePct.toLocaleString(language, { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals })

// Reactive hooks — re-render when currency changes
export const useFmt = (): ((v: number) => string) => {
  const currency = usePreferencesStore((s) => s.currency) as SupportedCurrency
  return (v: number) => formatCurrency0(v, currency)
}

export const useFmt2 = (): ((v: number) => string) => {
  const currency = usePreferencesStore((s) => s.currency) as SupportedCurrency
  return (v: number) => formatCurrency(v, currency)
}
