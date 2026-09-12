import { useQuery } from '@tanstack/react-query'
import { getCompanyNews } from '../lib/newsApi'

export function useCompanyNews(symbol: string | null) {
  return useQuery({
    queryKey: ['company-news', symbol],
    enabled: !!symbol,
    staleTime: 5 * 60_000,
    queryFn: () => getCompanyNews(symbol!),
  })
}
