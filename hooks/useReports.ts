import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { groupByType, type CommissionWithType } from '../lib/commissions'

function weekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999)
  return { start: mon.toISOString(), end: sun.toISOString() }
}

export function useWeeklyReport() {
  const session = useAuthStore((s) => s.session)
  const { start, end } = weekBounds()

  return useQuery({
    queryKey: ['weekly-report', session?.user.id, start],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_commissions')
        .select('*, dm_commission_types(id, name, icon, color)')
        .eq('user_id', session!.user.id)
        .gte('earned_at', start)
        .lte('earned_at', end)
        .order('earned_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CommissionWithType[]
    },
  })
}

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

export function usePendingByType() {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['pending-by-type', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      // TO_PAY é dinheiro já validado à espera de transferência — é a parte
      // mais certa de entrar, e estava a ser omitida daqui.
      const { data, error } = await supabase
        .from('dm_commissions')
        .select('*, dm_commission_types(id, name, icon, color)')
        .eq('user_id', session!.user.id)
        .in('status', ['PENDING', 'TO_PAY'])
        .order('expected_at', { ascending: true, nullsFirst: false })
      if (error) throw error

      const all = (data ?? []) as CommissionWithType[]
      const toPay   = all.filter((c) => c.status === 'TO_PAY').reduce((s, c) => s + c.amount, 0)
      const pending = all.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0)

      return {
        all,
        byType: groupByType(all),
        total: toPay + pending,
        toPay,
        toPayCount:   all.filter((c) => c.status === 'TO_PAY').length,
        pending,
        pendingCount: all.filter((c) => c.status === 'PENDING').length,
      }
    },
    refetchInterval: 60_000, // refetch a cada minuto
  })
}
