import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { invalidateSavingsQueries } from '../lib/savings'
import type { DmSavingsAccount, TablesInsert, TablesUpdate } from '../types/database'

export type SavingsPayload = Omit<TablesInsert<'dm_savings_accounts'>, 'user_id' | 'id' | 'created_at' | 'updated_at'>

// Os erros sobem tal como vêm do supabase-js (com code): o ecrã traduz a mensagem.
// 23505 = já existe outro produto marcado como fundo de emergência.
export function useSavingsAccounts() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()
  const uid = session?.user.id

  const query = useQuery({
    queryKey: ['savings-accounts', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_savings_accounts')
        .select('*')
        .eq('user_id', uid!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as DmSavingsAccount[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: SavingsPayload) => {
      const { error } = await supabase
        .from('dm_savings_accounts')
        .insert({ ...payload, user_id: uid! })
      if (error) throw error
    },
    onSuccess: () => invalidateSavingsQueries(qc),
  })

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TablesUpdate<'dm_savings_accounts'> }) => {
      const { error } = await supabase
        .from('dm_savings_accounts')
        .update(payload)
        .eq('id', id)
        .eq('user_id', uid!)
      if (error) throw error
    },
    onSuccess: () => invalidateSavingsQueries(qc),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_savings_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', uid!)
      if (error) throw error
    },
    onSuccess: () => invalidateSavingsQueries(qc),
  })

  return { ...query, create, update, remove }
}
