import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmCredit, TablesInsert, TablesUpdate } from '../types/database'

export function useCredits() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['credits', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_credits')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as DmCredit[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<TablesInsert<'dm_credits'>, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_credits')
        .insert({ ...payload, user_id: session!.user.id } as TablesInsert<'dm_credits'>)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & TablesUpdate<'dm_credits'>) => {
      const { error } = await supabase
        .from('dm_credits')
        .update(payload)
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.user.id) throw new Error('Sessão inválida')
      const { error, count } = await supabase
        .from('dm_credits')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', session.user.id)
      if (error) throw error
      if (!count) throw new Error('Crédito não encontrado ou sem permissão')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['credits'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (err: Error) => {
      Alert.alert('Erro ao eliminar', err.message)
    },
  })

  return { ...query, create, update, remove }
}
