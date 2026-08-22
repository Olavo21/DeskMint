import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmPortfolioLimit } from '../types/database'

export type LimitWithStatus = DmPortfolioLimit & {
  currentPct: number
  fillPct: number          // 0-1, capped at 1 for bar width
  status: 'ok' | 'warning' | 'exceeded'
}

function getStatus(currentPct: number, maxPct: number): 'ok' | 'warning' | 'exceeded' {
  if (currentPct >= maxPct) return 'exceeded'
  if (currentPct >= maxPct * 0.8) return 'warning'
  return 'ok'
}

const STATUS_COLOR = {
  ok:       '#14b8a6',
  warning:  '#f97316',
  exceeded: '#ef4444',
} as const

export { STATUS_COLOR }

export function usePortfolioLimits(assetWeights?: Record<string, number>) {
  const session     = useAuthStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['portfolio-limits', session?.user.id],
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_portfolio_limits')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('max_pct', { ascending: false })
      if (error) throw error
      return data as DmPortfolioLimit[]
    },
  })

  const withStatus: LimitWithStatus[] = (query.data ?? []).map((limit) => {
    const currentPct = assetWeights?.[limit.ticker] ?? 0
    const fillPct    = Math.min(currentPct / limit.max_pct, 1)
    return {
      ...limit,
      currentPct,
      fillPct,
      status: getStatus(currentPct, limit.max_pct),
    }
  })

  const upsert = useMutation({
    mutationFn: async (payload: { ticker: string; max_pct: number }) => {
      const { error } = await supabase
        .from('dm_portfolio_limits')
        .upsert(
          { ...payload, user_id: session!.user.id },
          { onConflict: 'user_id,ticker' },
        )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio-limits'] }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_portfolio_limits')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio-limits'] }),
  })

  function checkLimit(ticker: string, additionalPct: number) {
    const limit = (query.data ?? []).find((l) => l.ticker === ticker)
    if (!limit) return null
    const currentPct = assetWeights?.[ticker] ?? 0
    const afterPct   = currentPct + additionalPct
    return {
      maxPct:     limit.max_pct,
      currentPct,
      afterPct,
      wouldExceed: afterPct > limit.max_pct,
      exceedBy:    Math.max(0, afterPct - limit.max_pct),
    }
  }

  return { ...query, limits: withStatus, upsert, remove, checkLimit }
}
