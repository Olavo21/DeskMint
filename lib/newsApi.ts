const BASE = 'https://finnhub.io/api/v1'
const KEY  = process.env.EXPO_PUBLIC_FINNHUB_KEY ?? ''

export type NewsItem = {
  id: number
  category: string
  datetime: number
  headline: string
  image: string
  related: string
  source: string
  summary: string
  url: string
}

// ─── S&P 500 por sector ──────────────────────────────────────────────────────
export const SP500_SECTORS = {
  tech:     ['AAPL', 'MSFT', 'GOOGL', 'META', 'ORCL', 'CRM', 'ADBE', 'NFLX'],
  semi:     ['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'AMAT', 'MU', 'TSM', 'ASML'],
  finance:  ['JPM', 'V', 'MA', 'BAC', 'GS', 'MS', 'AXP', 'WFC'],
  health:   ['UNH', 'LLY', 'JNJ', 'MRK', 'ABBV', 'PFE', 'AMGN', 'BMY'],
  energy:   ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PSX'],
  consumer: ['AMZN', 'TSLA', 'HD', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT'],
  industry: ['CAT', 'BA', 'GE', 'HON', 'UPS', 'RTX', 'LMT', 'DE'],
}

// ─── Mapeamento ETF → tickers subjacentes para notícias ─────────────────────
export const ETF_PROXIES: Record<string, string[]> = {
  'VWCE.DE': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'],   // FTSE All-World top holdings
  'SXRV.DE': ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META'],    // NASDAQ-100 top holdings
  'LSMC.DE': ['NVDA', 'TSM', 'AVGO', 'ASML', 'AMD'],       // Semiconductors
  'QQQ':     ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'META'],
  'SPY':     ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'],
  'VTI':     ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL'],
}

function dateRange(daysBack: number) {
  const to   = new Date()
  const from = new Date(); from.setDate(to.getDate() - daysBack)
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}&token=${KEY}`)
  if (!res.ok) throw new Error(`Finnhub ${res.status}`)
  return res.json()
}

export async function getMarketNews(category: 'general' | 'forex' | 'merger'): Promise<NewsItem[]> {
  if (!KEY) return []
  const data = await get<NewsItem[]>(`/news?category=${category}`)
  return Array.isArray(data) ? data.slice(0, 30) : []
}

export async function getCompanyNews(symbol: string, daysBack = 7): Promise<NewsItem[]> {
  if (!KEY) return []
  const { from, to } = dateRange(daysBack)
  try {
    const data = await get<NewsItem[]>(`/company-news?symbol=${symbol}&from=${from}&to=${to}`)
    return Array.isArray(data) ? data.slice(0, 8) : []
  } catch {
    return []
  }
}

// Busca notícias para múltiplos símbolos, combina e deduplica por URL
export async function getMultiNews(symbols: string[], daysBack = 7): Promise<NewsItem[]> {
  if (!KEY || symbols.length === 0) return []
  const batches = await Promise.allSettled(symbols.map((s) => getCompanyNews(s, daysBack)))
  const all = batches.flatMap((r) => r.status === 'fulfilled' ? r.value : [])
  const seen = new Set<string>()
  return all
    .filter((item) => { if (seen.has(item.url)) return false; seen.add(item.url); return true })
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 25)
}

// Notícias do S&P 500 por sector
export const getSectorNews = {
  tech:     () => getMultiNews(SP500_SECTORS.tech),
  semi:     () => getMultiNews(SP500_SECTORS.semi),
  finance:  () => getMultiNews(SP500_SECTORS.finance),
  health:   () => getMultiNews(SP500_SECTORS.health),
  energy:   () => getMultiNews(SP500_SECTORS.energy),
  consumer: () => getMultiNews(SP500_SECTORS.consumer),
  industry: () => getMultiNews(SP500_SECTORS.industry),
}

// Notícias para os tickers do portfolio do utilizador
export async function getPortfolioNews(tickers: string[]): Promise<NewsItem[]> {
  if (!KEY || tickers.length === 0) return []
  // ETFs → substituir pelos proxies; acções → usar directamente
  const resolved = tickers.flatMap((t) => ETF_PROXIES[t] ?? [t])
  const unique = [...new Set(resolved)].slice(0, 8) // máx 8 símbolos
  return getMultiNews(unique, 14)
}
