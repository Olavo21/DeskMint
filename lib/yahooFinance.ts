// Cliente para os endpoints públicos (não-oficiais) da Yahoo Finance.
//
// Porquê Yahoo e não a Finnhub (já integrada no resto da app): o plano
// grátis da Finnhub não dá acesso a histórico de preços — /stock/candle
// devolve "You don't have access to this resource". A Yahoo não exige
// chave, mas também não é uma API pública documentada/suportada — pode
// mudar ou bloquear pedidos sem aviso. Só funciona em iOS/Android: o
// endpoint não envia cabeçalhos CORS, por isso falha na build Web.
//
// Testado manualmente (22 ago 2026): /v8/finance/chart funciona sem
// autenticação; /v7/finance/quote e /v10/finance/quoteSummary passaram a
// exigir um "crumb" (sessão) e devolvem 401 — por isso não há Market Cap
// aqui, só o que o endpoint chart expõe no bloco "meta".

const UA = { 'User-Agent': 'Mozilla/5.0' }

export type YahooPoint = { time: number; value: number }

export type YahooQuoteMeta = {
  symbol: string
  longName: string
  exchange: string
  currency: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  volume: number
  postMarketPrice: number | null
}

export type YahooChartResult = { meta: YahooQuoteMeta; points: YahooPoint[] }

export type ChartPeriod = '1D' | '1S' | '1M' | '1A' | 'TUDO'

const PERIOD_PARAMS: Record<ChartPeriod, { range: string; interval: string }> = {
  '1D':   { range: '1d',  interval: '15m' },
  '1S':   { range: '5d',  interval: '30m' },
  '1M':   { range: '1mo', interval: '1d'  },
  '1A':   { range: '1y',  interval: '1wk' },
  'TUDO': { range: 'max', interval: '1mo' },
}

// A Yahoo usa o próprio sufixo de bolsa (".DE", ".L", ...) — igual ao que
// já guardamos em dm_portfolio_assets.ticker — exceto ".US", que não existe
// na Yahoo (símbolo dos EUA é sempre "nu" — "NVDA", nunca "NVDA.US").
function toYahooSymbol(ticker: string): string {
  return ticker.toUpperCase().endsWith('.US') ? ticker.slice(0, -3) : ticker
}

export async function getYahooChart(ticker: string, period: ChartPeriod): Promise<YahooChartResult | null> {
  const symbol = toYahooSymbol(ticker)
  const { range, interval } = PERIOD_PARAMS[period]
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?range=${range}&interval=${interval}&includePrePost=true`,
      { headers: UA }
    )
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null

    const m          = result.meta ?? {}
    const timestamps = (result.timestamp ?? []) as number[]
    const closes     = (result.indicators?.quote?.[0]?.close ?? []) as (number | null)[]

    const points: YahooPoint[] = timestamps
      .map((time, i) => ({ time, value: closes[i] }))
      .filter((p): p is YahooPoint => typeof p.value === 'number')

    const price         = m.regularMarketPrice ?? points.at(-1)?.value ?? 0
    const previousClose = m.previousClose ?? m.chartPreviousClose ?? price

    return {
      points,
      meta: {
        symbol:          m.symbol ?? symbol,
        longName:        m.longName ?? m.shortName ?? symbol,
        exchange:        m.fullExchangeName ?? m.exchangeName ?? '',
        currency:        m.currency ?? 'USD',
        price,
        previousClose,
        change:          price - previousClose,
        changePercent:   previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
        volume:          m.regularMarketVolume ?? 0,
        postMarketPrice: typeof m.postMarketPrice === 'number' ? m.postMarketPrice : null,
      },
    }
  } catch {
    return null
  }
}
