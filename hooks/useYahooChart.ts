import { useQuery } from '@tanstack/react-query'
import { getYahooChart, type ChartPeriod } from '../lib/yahooFinance'

export function useYahooChart(ticker: string | null, period: ChartPeriod) {
  return useQuery({
    queryKey: ['yahoo-chart', ticker, period],
    enabled: !!ticker,
    staleTime: 60_000,
    queryFn: () => getYahooChart(ticker!, period),
  })
}

// Sparklines intraday (1D) para vários tickers em simultâneo — usado pelo
// TickerBar. Uma única query em vez de um hook por item (regras dos hooks
// não permitem chamar useQuery dentro de um .map()).
export function useTickerSparklines(tickers: string[]) {
  const key = [...tickers].sort().join(',')

  return useQuery({
    queryKey: ['ticker-sparklines', key],
    enabled: tickers.length > 0,
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const entries = await Promise.all(
        tickers.map(async (ticker) => {
          const result = await getYahooChart(ticker, '1D')
          return [ticker, result?.points.map((p) => p.value) ?? []] as const
        })
      )
      return Object.fromEntries(entries) as Record<string, number[]>
    },
  })
}
