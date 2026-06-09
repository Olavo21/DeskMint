import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmPortfolioAsset, DmEmergencyFund, DmAsset } from '../types/database'

export function usePortfolio() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const updateAsset = useMutation({
    mutationFn: async ({
      id, currentValue, capitalInvested, units, avgPrice,
    }: {
      id: string
      currentValue: number
      capitalInvested: number
      units?: number
      avgPrice?: number
    }) => {
      const { error } = await supabase
        .from('dm_portfolio_assets')
        .update({
          current_value:    currentValue,
          capital_invested: capitalInvested,
          ...(units    !== undefined ? { units }     : {}),
          ...(avgPrice !== undefined ? { avg_price: avgPrice } : {}),
          last_updated: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_portfolio_assets')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const query = useQuery({
    queryKey: ['portfolio', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const uid = session!.user.id

      const [portfolioRes, emergencyRes, assetsRes] = await Promise.all([
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid).order('is_extra'),
        supabase.from('dm_emergency_fund').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dm_assets').select('*').eq('user_id', uid),
      ])

      const raw = (portfolioRes.data ?? []) as DmPortfolioAsset[]
      const totalValue   = raw.reduce((s, a) => s + a.current_value, 0)
      const totalCapital = raw.reduce((s, a) => s + a.capital_invested, 0)

      return {
        assets: raw.map((a) => ({
          ...a,
          pl:    a.current_value - a.capital_invested,
          plPct: a.capital_invested > 0 ? (a.current_value - a.capital_invested) / a.capital_invested : 0,
        })),
        totalValue,
        totalCapital,
        totalPL:    totalValue - totalCapital,
        totalPLPct: totalCapital > 0 ? (totalValue - totalCapital) / totalCapital : 0,
        emergencyFund:  emergencyRes.data as DmEmergencyFund | null,
        physicalAssets: (assetsRes.data ?? []) as DmAsset[],
      }
    },
  })

  return { ...query, updateAsset, deleteAsset }
}
