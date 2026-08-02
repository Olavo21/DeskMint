import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export type SavingBucket = {
  id: string
  user_id: string
  name: string
  emoji: string
  color: string
  target_amount: number
  current_amount: number
  deadline: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export type CreateBucketPayload = {
  name: string
  emoji: string
  color: string
  target_amount: number
  deadline?: string | null
}

export type UpdateBucketPayload = Partial<CreateBucketPayload>

const QK = ['saving-buckets'] as const

export function useSavingBuckets() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()
  const uid = session?.user.id

  const query = useQuery({
    queryKey: [...QK, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_saving_buckets')
        .select('*')
        .eq('user_id', uid!)
        .order('is_completed', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as SavingBucket[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: CreateBucketPayload) => {
      const { error } = await supabase
        .from('dm_saving_buckets')
        .insert({ ...payload, user_id: uid! })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const addAmount = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const bucket = query.data?.find((b) => b.id === id)
      if (!bucket) throw new Error('Bucket não encontrado')
      const newAmount = Math.min(bucket.current_amount + amount, bucket.target_amount)
      const { error } = await supabase
        .from('dm_saving_buckets')
        .update({
          current_amount: newAmount,
          is_completed: newAmount >= bucket.target_amount,
        })
        .eq('id', id)
        .eq('user_id', uid!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) => Alert.alert('Erro', e.message),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_saving_buckets')
        .delete()
        .eq('id', id)
        .eq('user_id', uid!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) => Alert.alert('Erro ao eliminar', e.message),
  })

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateBucketPayload }) => {
      const { error } = await supabase
        .from('dm_saving_buckets')
        .update(payload)
        .eq('id', id)
        .eq('user_id', uid!)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
    onError: (e: Error) => Alert.alert('Erro ao editar', e.message),
  })

  return { ...query, create, addAmount, remove, update }
}
