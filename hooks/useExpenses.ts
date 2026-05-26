import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmExpense, DmExpenseCategory, DmIncome, TablesInsert } from '../types/database'

type ExpenseWithCategory = DmExpense & { dm_expense_categories: DmExpenseCategory | null }

export function useExpenses(month: number, year: number) {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const update = useMutation({
    mutationFn: async ({ id, description, amount }: { id: string; description: string; amount: number }) => {
      const { error } = await supabase
        .from('dm_expenses')
        .update({ description, amount })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'dm_expenses'>, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_expenses')
        .insert({ ...payload, user_id: session!.user.id } as TablesInsert<'dm_expenses'>)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const query = useQuery({
    queryKey: ['expenses', month, year, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const [expRes, incRes] = await Promise.all([
        supabase
          .from('dm_expenses')
          .select('*, dm_expense_categories(id, name, type, icon)')
          .eq('user_id', session!.user.id)
          .eq('month', month)
          .eq('year', year)
          .order('is_fixed', { ascending: false }),
        supabase
          .from('dm_income')
          .select('total_net')
          .eq('user_id', session!.user.id)
          .eq('month', month)
          .eq('year', year)
          .maybeSingle(),
      ])

      const expenses = (expRes.data ?? []) as ExpenseWithCategory[]
      const income = (incRes.data as Pick<DmIncome, 'total_net'> | null)?.total_net ?? 0

      const fixed    = expenses.filter((e) => e.is_fixed && e.dm_expense_categories?.type !== 'SAVINGS')
      const variable = expenses.filter((e) => !e.is_fixed)
      const savings  = expenses.filter((e) => e.dm_expense_categories?.type === 'SAVINGS')

      return {
        expenses,
        fixed,
        variable,
        savings,
        totalFixed:    fixed.reduce((s, e) => s + e.amount, 0),
        totalVariable: variable.reduce((s, e) => s + e.amount, 0),
        totalSavings:  savings.reduce((s, e) => s + e.amount, 0),
        totalIncome:   income,
      }
    },
  })

  return { ...query, create, update, remove }
}
