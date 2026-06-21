import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useIncome(month: number, year: number) {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['income', month, year, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from('dm_income')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()
      return data
    },
  })

  const upsert = useMutation({
    mutationFn: async (totalNet: number) => {
      const { error } = await supabase.from('dm_income').upsert({
        user_id:    session!.user.id,
        month,
        year,
        base_salary: totalNet,
        total_net:   totalNet,
      }, { onConflict: 'user_id,month,year' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['income'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
  })

  return { ...query, upsert }
}
