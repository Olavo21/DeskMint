import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmPortfolioLot } from '../types/database'
import type { TablesInsert } from '../types/database'

export type LotWithIrs = DmPortfolioLot & {
  daysHeld: number
  irsExempt: boolean
  daysToExemption: number
  totalCost: number
}

function localIsoToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function enrichLot(lot: DmPortfolioLot): LotWithIrs {
  // Compara strings ISO → ambas interpretadas como UTC midnight → sem desvio de fuso
  const daysHeld = Math.floor(
    (Date.parse(localIsoToday()) - Date.parse(lot.purchase_date)) / 86_400_000,
  )
  const irsExempt = daysHeld >= 365
  const daysToExemption = Math.max(0, 365 - daysHeld)
  const totalCost = lot.quantity * lot.unit_price
  return { ...lot, daysHeld, irsExempt, daysToExemption, totalCost }
}

export function usePortfolioLots(assetId: string | null) {
  const session    = useAuthStore((s) => s.session)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['portfolio-lots', assetId, session?.user.id],
    enabled: !!session && !!assetId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_portfolio_lots')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('asset_id', assetId!)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      return (data as DmPortfolioLot[]).map(enrichLot)
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'dm_portfolio_lots'>, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_portfolio_lots')
        .insert({ ...payload, user_id: session!.user.id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-lots', assetId] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_portfolio_lots')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-lots', assetId] })
    },
  })

  return { ...query, create, remove }
}
