import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmEtfComposition, DmPortfolioAsset } from '../types/database'
import type { TablesInsert } from '../types/database'

export type LookThroughEntry = {
  ticker: string
  name: string
  directPct: number
  directValue: number
  viaEtfs: { etfTicker: string; etfValue: number; weight: number; contribution: number }[]
  totalPct: number
  totalValue: number
}

export function useEtfComposition(etfId: string | null) {
  const session     = useAuthStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['etf-composition', etfId, session?.user.id],
    enabled: !!session && !!etfId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_etf_composition')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('etf_id', etfId!)
        .order('weight_pct', { ascending: false })
      if (error) throw error
      return data as DmEtfComposition[]
    },
  })

  const upsert = useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'dm_etf_composition'>, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_etf_composition')
        .upsert(
          { ...payload, user_id: session!.user.id },
          { onConflict: 'etf_id,company_ticker' },
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etf-composition', etfId] })
      queryClient.invalidateQueries({ queryKey: ['look-through'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_etf_composition')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etf-composition', etfId] })
      queryClient.invalidateQueries({ queryKey: ['look-through'] })
    },
  })

  return { ...query, upsert, remove }
}

export function useLookThrough(assets: DmPortfolioAsset[]) {
  const session = useAuthStore((s) => s.session)

  const etfIds = assets
    .filter((a) => a.asset_type === 'ETF')
    .map((a) => a.id)

  return useQuery({
    queryKey: ['look-through', etfIds, session?.user.id],
    enabled: !!session && etfIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_etf_composition')
        .select('*')
        .eq('user_id', session!.user.id)
        .in('etf_id', etfIds)
      if (error) throw error

      const rows = data as DmEtfComposition[]
      const totalValue = assets.reduce((s, a) => s + a.current_value, 0)

      // Group by company_ticker
      const byTicker: Record<string, LookThroughEntry> = {}

      for (const row of rows) {
        const etfAsset = assets.find((a) => a.id === row.etf_id)
        if (!etfAsset) continue

        const contribution = (etfAsset.current_value * (row.weight_pct / 100))

        if (!byTicker[row.company_ticker]) {
          byTicker[row.company_ticker] = {
            ticker: row.company_ticker,
            name: row.company_name || row.company_ticker,
            directPct: 0,
            directValue: 0,
            viaEtfs: [],
            totalPct: 0,
            totalValue: 0,
          }
        }

        byTicker[row.company_ticker].viaEtfs.push({
          etfTicker: etfAsset.ticker,
          etfValue: etfAsset.current_value,
          weight: row.weight_pct,
          contribution,
        })
      }

      // Add direct positions — incluindo as que não têm sobreposição com nenhum ETF
      for (const asset of assets) {
        if (asset.asset_type === 'ETF') continue
        const tk = asset.ticker
        if (!byTicker[tk]) {
          byTicker[tk] = {
            ticker: tk, name: tk,
            directPct: 0, directValue: 0,
            viaEtfs: [], totalPct: 0, totalValue: 0,
          }
        }
        byTicker[tk].directValue = asset.current_value
        byTicker[tk].directPct  = totalValue > 0 ? (asset.current_value / totalValue) * 100 : 0
      }

      // Compute totals
      for (const entry of Object.values(byTicker)) {
        const viaEtfValue = entry.viaEtfs.reduce((s, e) => s + e.contribution, 0)
        entry.totalValue = entry.directValue + viaEtfValue
        entry.totalPct   = totalValue > 0 ? (entry.totalValue / totalValue) * 100 : 0
      }

      return Object.values(byTicker).sort((a, b) => b.totalPct - a.totalPct)
    },
  })
}
