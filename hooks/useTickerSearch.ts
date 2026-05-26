import { useState, useEffect, useCallback } from 'react'

const KEY = process.env.EXPO_PUBLIC_FINNHUB_KEY ?? ''

export type TickerResult = {
  symbol: string
  displaySymbol: string
  description: string
  type: string      // 'Common Stock' | 'ETP' | 'ETF' | etc.
}

function typeToAssetType(t: string): 'ETF' | 'STOCK' | 'CRYPTO' | 'OTHER' {
  const u = t.toUpperCase()
  if (u.includes('ETF') || u.includes('ETP') || u.includes('FUND')) return 'ETF'
  if (u.includes('CRYPTO'))                                           return 'CRYPTO'
  if (u.includes('COMMON') || u.includes('STOCK') || u.includes('EQUITY')) return 'STOCK'
  return 'OTHER'
}

export function useTickerSearch() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<TickerResult[]>([])
  const [loading, setLoading]   = useState(false)

  const search = useCallback(async (q: string) => {
    if (!KEY || q.length < 1) { setResults([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${KEY}`)
      const data = await res.json()
      setResults((data.result ?? []).slice(0, 8) as TickerResult[])
    } catch {
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(query), 400) // debounce 400ms
    return () => clearTimeout(t)
  }, [query, search])

  return { query, setQuery, results, loading, typeToAssetType }
}
