import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAssets() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const update = useMutation({
    mutationFn: async ({ id, name, value, debt }: { id: string; name: string; value: number; debt: number }) => {
      const { error } = await supabase
        .from('dm_assets')
        .update({ name, value, debt })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // Vincula (ou desvincula, com creditId=null) um asset a um crédito —
  // a dívida apresentada passa a vir do saldo em dívida real desse crédito.
  const linkCredit = useMutation({
    mutationFn: async ({ id, creditId }: { id: string; creditId: string | null }) => {
      const { error } = await supabase
        .from('dm_assets')
        .update({ credit_id: creditId })
        .eq('id', id)
        .eq('user_id', session!.user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return { update, linkCredit }
}
