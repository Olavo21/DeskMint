import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useTutorial() {
  const session   = useAuthStore((s) => s.session)
  const profile   = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const qc        = useQueryClient()
  const uid       = session?.user.id

  const hasTransaction = useQuery({
    queryKey: ['quickstart-has-transaction', uid],
    enabled: !!uid && !profile?.quickstart_completed,
    queryFn: async () => {
      const { count } = await supabase
        .from('dm_expenses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid!)
      return (count ?? 0) > 0
    },
  })

  const hasBucket = useQuery({
    queryKey: ['quickstart-has-bucket', uid],
    enabled: !!uid && !profile?.quickstart_completed,
    queryFn: async () => {
      const { count } = await supabase
        .from('dm_saving_buckets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid!)
      return (count ?? 0) > 0
    },
  })

  const complete = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('dm_profiles')
        .update({ quickstart_completed: true })
        .eq('id', uid!)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (profile) setProfile({ ...profile, quickstart_completed: true })
      qc.invalidateQueries({ queryKey: ['quickstart-has-transaction'] })
      qc.invalidateQueries({ queryKey: ['quickstart-has-bucket'] })
    },
  })

  // Auto-complete when all 3 steps are done
  useEffect(() => {
    if (
      !profile?.quickstart_completed &&
      hasTransaction.data === true &&
      hasBucket.data === true &&
      !complete.isPending
    ) {
      complete.mutate()
    }
  }, [hasTransaction.data, hasBucket.data, profile?.quickstart_completed])

  const steps = [
    { key: 'account',     label: 'Cria a tua conta',              done: true,                          route: null },
    { key: 'transaction', label: 'Regista a primeira transação',   done: hasTransaction.data === true,  route: '/(tabs)/orcamento' },
    { key: 'bucket',      label: 'Cria o primeiro objetivo',       done: hasBucket.data === true,       route: '/(tabs)/orcamento' },
  ] as const

  const completedCount = steps.filter((s) => s.done).length
  const isVisible      = !!uid && !profile?.quickstart_completed

  return { steps, completedCount, total: steps.length, isVisible, complete }
}
