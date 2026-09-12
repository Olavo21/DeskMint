import { useQuery } from '@tanstack/react-query'

const KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY ?? ''

export type TickerQuote = {
  ticker: string
  price: number
  changePct: number
}

export type TickerBarAsset = {
  ticker: string
  assetType: string
}

// Traduz o ticker guardado em dm_portfolio_assets para o símbolo que a
// Finnhub aceita no endpoint /quote:
// - CRYPTO usa o formato EXCHANGE:PAIR (ex: BINANCE:BTCUSDT) — sem isto a
//   Finnhub devolve dados de uma ação qualquer com o mesmo ticker (ex: "BTC"
//   sozinho corresponde a uma small-cap, não a Bitcoin).
// - Ações/ETFs dos EUA usam o símbolo simples, sem sufixo de bolsa (ex:
//   "NVDA", nunca "NVDA.US" — a Finnhub devolve tudo a zero com o sufixo).
// - Bolsas europeias (".DE" etc.) não estão disponíveis no plano grátis da
//   Finnhub ("You don't have access to this resource") — ficam de fora.
function toFinnhubSymbol({ ticker, assetType }: TickerBarAsset): string {
  const base = ticker.split('.')[0].toUpperCase()
  if (assetType === 'CRYPTO') return `BINANCE:${base}USDT`
  return base
}

// Cotações em tempo real para o TickerBar. Usa a Finnhub já integrada no
// projeto (hooks/useTickerSearch.ts, supabase/functions/stock-fundamentals) —
// não há integração com Yahoo Finance nesta base de código.
export function useTickerBarQuotes(assets: TickerBarAsset[]) {
  const key = [...assets].map((a) => `${a.ticker}:${a.assetType}`).sort().join(',')

  return useQuery({
    queryKey: ['ticker-bar-quotes', key],
    enabled: assets.length > 0 && !!KEY,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const results = await Promise.all(
        assets.map(async (asset) => {
          try {
            const symbol = toFinnhubSymbol(asset)
            const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${KEY}`)
            const data = await res.json()
            if (typeof data.c !== 'number' || data.c === 0) return null
            return { ticker: asset.ticker, price: data.c, changePct: data.dp ?? 0 } as TickerQuote
          } catch {
            return null
          }
        })
      )
      return results.filter((r): r is TickerQuote => r !== null)
    },
  })
}
