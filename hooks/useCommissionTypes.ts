import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmCommissionType, DmCommissionTypeInsert } from '../types/database'

export function useCommissionTypes() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['commission-types', session?.user.id],
    enabled: !!session,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_commission_types')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('name')
      if (error) throw error
      return (data ?? []) as DmCommissionType[]
    },
  })

  const create = useMutation({
    mutationFn: async (payload: Omit<DmCommissionTypeInsert, 'user_id'>) => {
      const { error } = await supabase
        .from('dm_commission_types')
        .insert({ ...payload, user_id: session!.user.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission-types'] }),
  })

  return { ...query, create }
}
