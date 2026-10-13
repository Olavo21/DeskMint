import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmPortfolioAsset, DmEmergencyFund, DmAsset } from '../types/database'
import { splitSavings } from '../lib/savings'

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
    staleTime: 60_000,
    queryFn: async () => {
      const uid = session!.user.id

      const [portfolioRes, emergencyRes, assetsRes, savingsRes] = await Promise.all([
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid).order('is_extra'),
        supabase.from('dm_emergency_fund').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dm_assets').select('*').eq('user_id', uid),
        supabase.from('dm_savings_accounts').select('balance, is_emergency_fund').eq('user_id', uid),
      ])

      const failed = [portfolioRes, emergencyRes, assetsRes, savingsRes].find((r) => r.error)
      if (failed?.error) throw failed.error

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
        // O fundo efetivo, igual ao da Dashboard (produto marcado ou valor editável).
        // Devolver a linha crua de dm_emergency_fund dava ao Triângulo Financeiro um
        // número diferente do da Dashboard quando há um produto marcado.
        emergencyFund:  splitSavings(savingsRes.data ?? [], (emergencyRes.data as DmEmergencyFund | null)?.current_amount ?? 0).emergencyFund,
        physicalAssets: (assetsRes.data ?? []) as DmAsset[],
      }
    },
  })

  return { ...query, updateAsset, deleteAsset }
}
