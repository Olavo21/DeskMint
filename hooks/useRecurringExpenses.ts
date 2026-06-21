import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmRecurringExpense, TablesInsert, TablesUpdate } from '../types/database'

export function useRecurringExpenses() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['recurring-expenses', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_recurring_expenses')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as DmRecurringExpense[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'dm_recurring_expenses'>, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_recurring_expenses')
        .insert({ ...payload, user_id: session!.user.id } as TablesInsert<'dm_recurring_expenses'>)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-expenses'] }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TablesUpdate<'dm_recurring_expenses'>) => {
      const { error } = await supabase
        .from('dm_recurring_expenses')
        .update(payload)
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-expenses'] }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_recurring_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-expenses'] }),
  })

  // Rede de segurança: garante que os recorrentes do mês atual já foram
  // semeados em dm_expenses, mesmo que o cron mensal ainda não tenha corrido.
  const seedCurrentMonth = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      const { data, error } = await supabase.rpc('seed_recurring_expenses_for_user', {
        p_month: month,
        p_year: year,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: (inserted) => {
      if (inserted > 0) qc.invalidateQueries({ queryKey: ['expenses'] })
    },
  })

  return { ...query, create, update, remove, seedCurrentMonth }
}
