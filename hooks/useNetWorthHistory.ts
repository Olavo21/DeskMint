import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const PT_MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export type NetWorthPoint = {
  year:      number
  month:     number
  net_worth: number
  label:     string
}

export function useNetWorthHistory() {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey:  ['net_worth_history', session?.user.id],
    enabled:   !!session,
    staleTime: 1000 * 60 * 5,
    queryFn:   async () => {
      // Busca os últimos 6 meses DESC e inverte → ordem cronológica no gráfico
      const { data, error } = await supabase
        .from('dm_net_worth_snapshots')
        .select('year, month, net_worth')
        .eq('user_id', session!.user.id)
        .order('year',  { ascending: false })
        .order('month', { ascending: false })
        .limit(6)

      if (error) throw error

      return ([...(data ?? [])].reverse() as { year: number; month: number; net_worth: number }[])
        .map((row) => ({
          ...row,
          label: PT_MONTHS[row.month - 1] ?? String(row.month),
        })) as NetWorthPoint[]
    },
  })
}
