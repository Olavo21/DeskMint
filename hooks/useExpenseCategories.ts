import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmExpenseCategory } from '../types/database'

export function useExpenseCategories() {
  const session = useAuthStore((s) => s.session)

  const query = useQuery({
    queryKey: ['expense-categories', session?.user.id],
    enabled: !!session,
    staleTime: Infinity, // categorias raramente mudam
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_expense_categories')
        .select('*')
        .eq('user_id', session!.user.id)
        .order('name')
      if (error) throw error
      return (data ?? []) as DmExpenseCategory[]
    },
  })

  return query
}
