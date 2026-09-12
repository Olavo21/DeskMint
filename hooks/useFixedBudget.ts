import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const REAL_TODAY = new Date()
const REAL_MONTH = REAL_TODAY.getMonth() + 1
const REAL_YEAR  = REAL_TODAY.getFullYear()

// Rendimento e despesas fixas da Dashboard: um orçamento base permanente,
// sem noção de mês. O rendimento é sempre o último valor registado (não
// reseta ao virar o mês). Despesas/Poupança usam a mesma separação por tipo
// de categoria (NEEDS/WANTS vs SAVINGS) que o Orçamento, para os dois ecrãs
// mostrarem sempre os mesmos números.
export function useFixedBudget() {
  const session = useAuthStore((s) => s.session)
  const qc = useQueryClient()
  const uid = session?.user.id

  const query = useQuery({
    queryKey: ['fixed-budget', uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const [incomeRes, recurringRes] = await Promise.all([
        supabase
          .from('dm_income')
          .select('total_net')
          .eq('user_id', uid!)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('dm_recurring_expenses')
          .select('amount, dm_credits(monthly_payment), dm_expense_categories(type)')
          .eq('user_id', uid!)
          .eq('is_active', true),
      ])
      if (incomeRes.error) throw incomeRes.error
      if (recurringRes.error) throw recurringRes.error

      const income = incomeRes.data?.total_net ?? 0
      // Despesa ligada a um crédito usa sempre a prestação mensal atual do
      // crédito, não o amount guardado (evita desincronizar com Créditos).
      const recurring = (recurringRes.data ?? []) as unknown as {
        amount: number
        dm_credits: { monthly_payment: number } | null
        dm_expense_categories: { type: string } | null
      }[]

      let expenses = 0
      let savings = 0
      for (const e of recurring) {
        const amt = e.dm_credits?.monthly_payment ?? e.amount
        if (e.dm_expense_categories?.type === 'SAVINGS') savings += amt
        else expenses += amt
      }

      return { income, expenses, savings, available: income - expenses - savings }
    },
  })

  const upsertIncome = useMutation({
    mutationFn: async (totalNet: number) => {
      const { error } = await supabase.from('dm_income').upsert({
        user_id:     uid!,
        month:       REAL_MONTH,
        year:        REAL_YEAR,
        base_salary: totalNet,
        total_net:   totalNet,
      }, { onConflict: 'user_id,month,year' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fixed-budget'] })
      qc.invalidateQueries({ queryKey: ['income'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return { ...query, upsertIncome }
}
