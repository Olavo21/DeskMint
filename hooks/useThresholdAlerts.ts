import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmPortfolioAsset, DmPortfolioThreshold } from '../types/database'
import type { LookThroughEntry } from './useEtfComposition'

export type ThresholdStatus = 'ok' | 'warning' | 'breached'

export type ThresholdAlert = DmPortfolioThreshold & {
  currentPct: number
  fillPct: number
  status: ThresholdStatus
}

export const THRESHOLD_COLOR: Record<ThresholdStatus, string> = {
  ok:      '#14b8a6',
  warning: '#f97316',
  breached: '#ef4444',
}

function computeStatus(
  current: number,
  max: number | null,
  min: number | null,
): ThresholdStatus {
  const rank: Record<ThresholdStatus, number> = { ok: 0, warning: 1, breached: 2 }

  let maxStatus: ThresholdStatus = 'ok'
  if (max !== null) {
    if (current >= max) maxStatus = 'breached'
    else if (current >= max * 0.8) maxStatus = 'warning'
  }

  let minStatus: ThresholdStatus = 'ok'
  if (min !== null) {
    if (current < min) minStatus = 'breached'
    else if (current < min * 1.15) minStatus = 'warning'
  }

  return rank[maxStatus] >= rank[minStatus] ? maxStatus : minStatus
}

export function useThresholdAlerts(
  assets: DmPortfolioAsset[],
  lookThroughEntries?: LookThroughEntry[],
) {
  const session     = useAuthStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['portfolio-thresholds', session?.user.id],
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_portfolio_thresholds')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as DmPortfolioThreshold[]
    },
  })

  const totalValue = assets.reduce((s, a) => s + a.current_value, 0)

  const alerts: ThresholdAlert[] = (query.data ?? []).map((threshold) => {
    let currentPct = 0

    if (threshold.use_look_through && threshold.ticker) {
      const entry = lookThroughEntries?.find((e) => e.ticker === threshold.ticker)
      currentPct = entry?.totalPct ?? 0
    } else if (threshold.ticker) {
      const asset = assets.find((a) => a.ticker === threshold.ticker)
      currentPct = asset && totalValue > 0
        ? (asset.current_value / totalValue) * 100
        : 0
    } else if (threshold.asset_type) {
      const typeSum = assets
        .filter((a) => a.asset_type === threshold.asset_type)
        .reduce((s, a) => s + a.current_value, 0)
      currentPct = totalValue > 0 ? (typeSum / totalValue) * 100 : 0
    }

    // fillPct relative to the binding threshold (max preferred over min)
    const ref = threshold.max_pct ?? threshold.min_pct ?? 1
    const fillPct = Math.min(currentPct / ref, 1)

    return {
      ...threshold,
      currentPct,
      fillPct,
      status: computeStatus(currentPct, threshold.max_pct, threshold.min_pct),
    }
  })

  const breachedCount = alerts.filter((a) => a.status === 'breached').length
  const warningCount  = alerts.filter((a) => a.status === 'warning').length

  const create = useMutation({
    mutationFn: async (
      payload: Pick<DmPortfolioThreshold, 'block_name' | 'ticker' | 'asset_type' | 'max_pct' | 'min_pct' | 'use_look_through'>,
    ) => {
      const { error } = await supabase
        .from('dm_portfolio_thresholds')
        .insert({ ...payload, user_id: session!.user.id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio-thresholds'] }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_portfolio_thresholds')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio-thresholds'] }),
  })

  return { ...query, alerts, breachedCount, warningCount, create, remove }
}
