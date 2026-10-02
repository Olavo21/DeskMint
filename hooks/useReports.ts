import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { groupByType, type CommissionWithType, type CommissionLike } from '../lib/commissions'

export function useMonthlyReport(month: number, year: number) {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['monthly-report', month, year, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const uid = session!.user.id

      const [comRes, incRes, portRes, catRes] = await Promise.all([
        supabase
          .from('dm_commissions')
          .select('*, dm_commission_types(id, name, icon, color)')
          .eq('user_id', uid)
          .gte('earned_at', new Date(year, month - 1, 1).toISOString())
          .lt('earned_at',  new Date(year, month, 1).toISOString())
          .order('earned_at', { ascending: false }),
        supabase.from('dm_income').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid),
        supabase
          .from('dm_expenses')
          .select('*, dm_expense_categories(name, type, icon)')
          .eq('user_id', uid).eq('month', month).eq('year', year),
      ])

      const commissions = (comRes.data ?? []) as CommissionWithType[]
      const income = incRes.data
      const portfolio = portRes.data ?? []
      const expenses = catRes.data ?? []

      // Top 5 despesas
      const topExpenses = [...expenses]
        .sort((a, b) => (b as { amount: number }).amount - (a as { amount: number }).amount)
        .slice(0, 5)

      const totalPortfolio = portfolio.reduce((s, a) => s + (a as { current_value: number }).current_value, 0)
      const totalCapital   = portfolio.reduce((s, a) => s + (a as { capital_invested: number }).capital_invested, 0)

      return {
        commissions,
        totalCommPaid:    commissions.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0),
        totalCommToPay:   commissions.filter((c) => c.status === 'TO_PAY').reduce((s, c) => s + c.amount, 0),
        totalCommPending: commissions.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0),
        commissionsByType: groupByType(commissions),
        income,
        topExpenses,
        portfolio: { totalValue: totalPortfolio, totalPL: totalPortfolio - totalCapital },
      }
    },
  })
}

export function useAllTimeReport() {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['all-time-report', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_commissions')
        .select('*')
        .eq('user_id', session!.user.id)
      if (error) throw error
      // groupByType já tira CANCELLED do total — não somar à mão (ver AGENTS.md).
      const groups = groupByType((data ?? []) as CommissionLike[])
      return { total: groups.reduce((s, g) => s + g.total, 0) }
    },
  })
}
