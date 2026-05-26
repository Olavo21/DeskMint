import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmCommission, TablesInsert } from '../types/database'

export function useCommissions() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['commissions', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_commissions')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('earned_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as DmCommission[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'dm_commissions'>, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_commissions')
        .insert({ ...payload, user_id: session!.user.id } as TablesInsert<'dm_commissions'>)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, paidAt }: { id: string; status: 'PAID' | 'CANCELLED'; paidAt?: string }) => {
      const { error } = await supabase
        .from('dm_commissions')
        .update({ status, ...(paidAt ? { paid_at: paidAt } : {}) })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  })

  const data = query.data ?? []
  const totals = {
    paid:      data.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0),
    pending:   data.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0),
    cancelled: data.filter((c) => c.status === 'CANCELLED').reduce((s, c) => s + c.amount, 0),
  }

  return { ...query, create, updateStatus, totals }
}
