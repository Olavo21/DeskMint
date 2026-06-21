import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, paidAt }: { id: string; status: 'TO_PAY' | 'PAID' | 'PENDING' | 'CANCELLED'; paidAt?: string }) => {
      const { error } = await supabase
        .from('dm_commissions')
        .update({ status, ...(paidAt ? { paid_at: paidAt } : {}) })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({
      id, description, client, amount, earnedAt, expectedAt, notes, typeId,
    }: {
      id: string
      description: string
      client: string | null
      amount: number
      earnedAt: string
      expectedAt: string | null
      notes: string | null
      typeId: string | null
    }) => {
      const { error } = await supabase
        .from('dm_commissions')
        .update({
          description, client, amount,
          earned_at: earnedAt, expected_at: expectedAt,
          notes, type_id: typeId,
        })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.user.id) throw new Error('Sessão inválida')
      const { error, count } = await supabase
        .from('dm_commissions')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', session.user.id)
      if (error) throw error
      if (!count) throw new Error('Comissão não encontrada ou sem permissão')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['commissions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => {
      Alert.alert('Erro ao eliminar', err.message)
    },
  })

  const data = query.data ?? []
  const totals = {
    paid:      data.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0),
    toPay:     data.filter((c) => c.status === 'TO_PAY').reduce((s, c) => s + c.amount, 0),
    pending:   data.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0),
    cancelled: data.filter((c) => c.status === 'CANCELLED').reduce((s, c) => s + c.amount, 0),
  }

  return { ...query, create, update, updateStatus, remove, totals }
}
