import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmCommission, DmCommissionType } from '../types/database'

type CommissionWithType = DmCommission & { dm_commission_types: DmCommissionType | null }

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

      const [comRes, incRes, budRes, portRes, catRes] = await Promise.all([
        supabase
          .from('dm_commissions')
          .select('*, dm_commission_types(id, name, icon, color)')
          .eq('user_id', uid)
          .gte('earned_at', new Date(year, month - 1, 1).toISOString())
          .lt('earned_at',  new Date(year, month, 1).toISOString())
          .order('earned_at', { ascending: false }),
        supabase.from('dm_income').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_budget_rules').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid),
        supabase
          .from('dm_expenses')
          .select('*, dm_expense_categories(name, type, icon)')
          .eq('user_id', uid).eq('month', month).eq('year', year),
      ])

      const commissions = (comRes.data ?? []) as CommissionWithType[]
      const income = incRes.data
      const budget = budRes.data
      const portfolio = portRes.data ?? []
      const expenses = catRes.data ?? []

      // Comissões por tipo
      const byType = commissions.reduce<Record<string, { type: DmCommissionType | null; paid: number; pending: number; count: number }>>((acc, c) => {
        const key = c.type_id ?? 'sem-tipo'
        if (!acc[key]) acc[key] = { type: c.dm_commission_types, paid: 0, pending: 0, count: 0 }
        acc[key].count++
        if (c.status === 'PAID')    acc[key].paid    += c.amount
        if (c.status === 'PENDING') acc[key].pending += c.amount
        return acc
      }, {})

      // Top 5 despesas
      const topExpenses = [...expenses]
        .sort((a, b) => (b as { amount: number }).amount - (a as { amount: number }).amount)
        .slice(0, 5)

      const totalPortfolio = portfolio.reduce((s, a) => s + (a as { current_value: number }).current_value, 0)
      const totalCapital   = portfolio.reduce((s, a) => s + (a as { capital_invested: number }).capital_invested, 0)

      return {
        commissions,
        totalCommPaid:    commissions.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amount, 0),
        totalCommPending: commissions.filter((c) => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0),
        commissionsByType: Object.values(byType),
        income,
        budget,
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
      const { data, error } = await supabase
        .from('dm_commissions')
        .select('*, dm_commission_types(id, name, icon, color)')
        .eq('user_id', session!.user.id)
        .eq('status', 'PENDING')
        .order('expected_at', { ascending: true, nullsFirst: false })
      if (error) throw error

      const all = (data ?? []) as CommissionWithType[]
      const byType = all.reduce<Record<string, { type: DmCommissionType | null; items: CommissionWithType[]; total: number }>>((acc, c) => {
        const key = c.type_id ?? 'sem-tipo'
        if (!acc[key]) acc[key] = { type: c.dm_commission_types, items: [], total: 0 }
        acc[key].items.push(c)
        acc[key].total += c.amount
        return acc
      }, {})

      return { all, byType: Object.values(byType), totalPending: all.reduce((s, c) => s + c.amount, 0) }
    },
    refetchInterval: 60_000, // refetch a cada minuto
  })
}
