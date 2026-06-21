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

  return { update }
}
