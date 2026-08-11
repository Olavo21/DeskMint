import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmExpenseCategory, DmIncome, TablesInsert } from '../types/database'

export type SourcedExpense = {
  id: string
  user_id: string
  category_id: string | null
  description: string | null
  amount: number
  is_fixed: boolean
  month: number
  year: number
  paid_at: string | null
  created_at: string
  updated_at: string
  dm_expense_categories: DmExpenseCategory | null
  _source: 'recurring' | 'expense'
}

type CreatePayload = Omit<TablesInsert<'dm_expenses'>, 'user_id'> & {
  dia_vencimento?: number | null
}

export function useExpenses(month: number, year: number) {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const update = useMutation({
    mutationFn: async ({
      id, description, amount, _source = 'expense',
    }: { id: string; description: string; amount: number; _source?: 'recurring' | 'expense' }) => {
      if (_source === 'recurring') {
        const { error } = await supabase
          .from('dm_recurring_expenses')
          .update({ description, amount })
          .eq('id', id)
          .eq('user_id', session!.user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dm_expenses')
          .update({ description, amount })
          .eq('id', id)
          .eq('user_id', session!.user.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: async ({
      id, _source = 'expense',
    }: { id: string; _source?: 'recurring' | 'expense' }) => {
      if (_source === 'recurring') {
        const { error } = await supabase
          .from('dm_recurring_expenses')
          .delete()
          .eq('id', id)
          .eq('user_id', session!.user.id)
        if (error) throw error
      } else {
        if (!session?.user.id) throw new Error('Sessão inválida')
        const { error, count } = await supabase
          .from('dm_expenses')
          .delete({ count: 'exact' })
          .eq('id', id)
          .eq('user_id', session.user.id)
        if (error) throw error
        if (!count) throw new Error('Despesa não encontrada ou sem permissão')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => {
      Alert.alert('Erro ao eliminar', err.message)
    },
  })

  const create = useMutation({
    mutationFn: async (payload: CreatePayload) => {
      const uid = session!.user.id
      if (payload.is_fixed) {
        const { error } = await supabase.from('dm_recurring_expenses').insert({
          category_id:    payload.category_id!,
          description:    payload.description!,
          amount:         payload.amount!,
          is_fixed:       true,
          dia_vencimento: payload.dia_vencimento ?? null,
          user_id:        uid,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from('dm_expenses').insert({
          category_id: payload.category_id,
          description: payload.description,
          amount:      payload.amount,
          is_fixed:    false,
          month:       payload.month,
          year:        payload.year,
          paid_at:     payload.paid_at,
          user_id:     uid,
        } as TablesInsert<'dm_expenses'>)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const query = useQuery({
    queryKey: ['expenses', month, year, session?.user.id],
    enabled: !!session,
    staleTime: 30_000,
    queryFn: async () => {
      const uid = session!.user.id

      const [expRes, recRes, incRes] = await Promise.all([
        supabase
          .from('dm_expenses')
          .select('*, dm_expense_categories(id, name, type, icon)')
          .eq('user_id', uid)
          .eq('is_fixed', false)
          .eq('month', month)
          .eq('year', year)
          .order('created_at', { ascending: false }),
        supabase
          .from('dm_recurring_expenses')
          .select('*, dm_expense_categories(id, name, type, icon)')
          .eq('user_id', uid)
          .eq('is_active', true),
        supabase
          .from('dm_income')
          .select('total_net')
          .eq('user_id', uid)
          .eq('month', month)
          .eq('year', year)
          .maybeSingle(),
      ])

      if (expRes.error) throw expRes.error
      if (recRes.error) throw recRes.error

      const fixedExpenses: SourcedExpense[] = ((recRes.data ?? []) as any[]).map((r) => ({
        id:           r.id,
        user_id:      r.user_id,
        category_id:  r.category_id,
        description:  r.description,
        amount:       r.amount,
        is_fixed:     true,
        month,
        year,
        paid_at:      null,
        created_at:   r.created_at,
        updated_at:   r.updated_at,
        dm_expense_categories: r.dm_expense_categories,
        _source:      'recurring' as const,
      }))

      const variableExpenses: SourcedExpense[] = ((expRes.data ?? []) as any[]).map((e) => ({
        ...e,
        _source: 'expense' as const,
      }))

      const expenses = [...fixedExpenses, ...variableExpenses]
      const income   = (incRes.data as Pick<DmIncome, 'total_net'> | null)?.total_net ?? 0

      const fixed    = fixedExpenses
      const variable = variableExpenses.filter((e) => e.dm_expense_categories?.type !== 'SAVINGS')
      const savings  = variableExpenses.filter((e) => e.dm_expense_categories?.type === 'SAVINGS')

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
