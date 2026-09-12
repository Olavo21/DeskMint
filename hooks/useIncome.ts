import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useIncome(month: number, year: number) {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()

  // Leitura ignora month/year: rendimento é fixo (não reseta ao mudar o mês),
  // lê sempre a linha mais recente — mesmo padrão de hooks/useDashboard.ts e
  // hooks/useFixedBudget.ts. O upsert continua a escrever no month/year pedido.
  const query = useQuery({
    queryKey: ['income', session?.user.id],
    enabled: !!session,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('dm_income')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
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
