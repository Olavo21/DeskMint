import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { Range } from '../components/investments/PortfolioLineChart'

function rangeToFromDate(range: Range): string | null {
  const now = new Date()
  switch (range) {
    case '1M':  now.setMonth(now.getMonth() - 1);       break
    case '3M':  now.setMonth(now.getMonth() - 3);       break
    case 'YTD': return `${now.getFullYear()}-01-01`
    case '1A':  now.setFullYear(now.getFullYear() - 1); break
    case '5A':  now.setFullYear(now.getFullYear() - 5); break
    case 'Max': return null
  }
  return now.toISOString().split('T')[0]
}

export function usePortfolioHistory(range: Range) {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['portfolio-history', session?.user.id, range],
    enabled: !!session,
    queryFn: async () => {
      const uid = session!.user.id

      const { data: assets } = await supabase
        .from('dm_portfolio_assets')
        .select('id')
        .eq('user_id', uid)

      if (!assets?.length) return []

      const assetIds = assets.map((a: { id: string }) => a.id)
      const fromDate = rangeToFromDate(range)

      let query = supabase
        .from('dm_portfolio_snapshots')
        .select('date, total_value')
        .in('portfolio_asset_id', assetIds)
        .order('date')

      if (fromDate) query = query.gte('date', fromDate)

      const { data: snaps } = await query
      if (!snaps?.length) return []

      // Sum total_value by date across all assets
      const byDate = new Map<string, number>()
      for (const s of snaps as { date: string; total_value: number }[]) {
        byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.total_value)
      }

      return Array.from(byDate.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))
    },
  })
}
