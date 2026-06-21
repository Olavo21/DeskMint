import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useEmergencyFund() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const upsert = useMutation({
    mutationFn: async (currentAmount: number) => {
      const { error } = await supabase.from('dm_emergency_fund').upsert({
        user_id:        session!.user.id,
        current_amount: currentAmount,
      }, { onConflict: 'user_id' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  return { upsert }
}
