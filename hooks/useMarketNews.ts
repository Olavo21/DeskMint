import { useQuery } from '@tanstack/react-query'
import {
  getMarketNews, getSectorNews, getPortfolioNews,
  type NewsItem,
} from '../lib/newsApi'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type NewsCategory =
  | 'portfolio'
  | 'geral'
  | 'tech'
  | 'semi'
  | 'finance'
  | 'health'
  | 'energy'
  | 'consumer'
  | 'industry'

export const NEWS_CATEGORIES: { key: NewsCategory; label: string; icon: string; color: string }[] = [
  { key: 'portfolio', label: 'Portfolio',      icon: '⭐', color: '#14b8a6' },
  { key: 'geral',    label: 'Mercado',         icon: '🌍', color: '#6366f1' },
  { key: 'tech',     label: 'Tecnologia',      icon: '💻', color: '#3b82f6' },
  { key: 'semi',     label: 'Semicondutores',  icon: '🔬', color: '#f59e0b' },
  { key: 'finance',  label: 'Financeiro',      icon: '🏦', color: '#10b981' },
  { key: 'health',   label: 'Saúde',           icon: '💊', color: '#ec4899' },
  { key: 'energy',   label: 'Energia',         icon: '⚡', color: '#f97316' },
  { key: 'consumer', label: 'Consumo',         icon: '🛒', color: '#8b5cf6' },
  { key: 'industry', label: 'Industrial',      icon: '🏭', color: '#64748b' },
]

const FETCHERS: Record<Exclude<NewsCategory, 'portfolio'>, () => Promise<NewsItem[]>> = {
  geral:    () => getMarketNews('general'),
  tech:     getSectorNews.tech,
  semi:     getSectorNews.semi,
  finance:  getSectorNews.finance,
  health:   getSectorNews.health,
  energy:   getSectorNews.energy,
  consumer: getSectorNews.consumer,
  industry: getSectorNews.industry,
}

export function useMarketNews(category: NewsCategory) {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['market-news', category, session?.user.id],
    staleTime: 1000 * 60 * 30, // cache 30 min — poupa chamadas à API
    retry: 1,
    queryFn: async () => {
      if (category === 'portfolio') {
        // Buscar tickers do portfolio do utilizador
        const { data } = await supabase
          .from('dm_portfolio_assets')
          .select('ticker')
          .eq('user_id', session!.user.id)
        const tickers = (data ?? []).map((a: { ticker: string }) => a.ticker)
        return getPortfolioNews(tickers)
      }
      return FETCHERS[category]()
    },
  })
}

export type { NewsItem }
