import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useOnboardingState() {
  const profile    = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const qc         = useQueryClient()

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('dm_profiles')
        .update({ onboarding_done: true })
        .eq('id', profile!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setProfile(data as any)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return {
    isCompleted: profile?.onboarding_done ?? false,
    completeOnboarding,
  }
}
