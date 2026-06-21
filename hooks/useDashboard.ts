import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmIncome, DmBudgetRule, DmPortfolioAsset, DmEmergencyFund, DmAsset } from '../types/database'

type RawExpense = {
  amount: number
  is_fixed: boolean
  dm_expense_categories: { type: string } | null
}

export function useDashboard(month: number, year: number) {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['dashboard', month, year, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const uid = session!.user.id

      const [incomeRes, budgetRes, portfolioRes, emergencyRes, assetsRes, expensesRes] = await Promise.all([
        supabase.from('dm_income').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_budget_rules').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid),
        supabase.from('dm_emergency_fund').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dm_assets').select('*').eq('user_id', uid),
        supabase.from('dm_expenses')
          .select('amount, is_fixed, dm_expense_categories(type)')
          .eq('user_id', uid)
          .eq('month', month)
          .eq('year', year),
      ])

      const income    = (incomeRes.data as DmIncome | null)?.total_net ?? 0
      const budget    = budgetRes.data as DmBudgetRule | null
      const portfolio = (portfolioRes.data as DmPortfolioAsset[]) ?? []
      const emergency = emergencyRes.data as DmEmergencyFund | null
      const assets    = (assetsRes.data as DmAsset[]) ?? []
      const rawExp    = (expensesRes.data ?? []) as RawExpense[]

      // Totais reais calculados directamente de dm_expenses
      const needsAmt   = rawExp.filter((e) => e.dm_expense_categories?.type === 'NEEDS').reduce((s, e) => s + e.amount, 0)
      const wantsAmt   = rawExp.filter((e) => e.dm_expense_categories?.type === 'WANTS').reduce((s, e) => s + e.amount, 0)
      const savingsAmt = rawExp.filter((e) => e.dm_expense_categories?.type === 'SAVINGS').reduce((s, e) => s + e.amount, 0)
      const totalExpenses = needsAmt + wantsAmt

      const portfolioValue   = portfolio.reduce((s, a) => s + a.current_value, 0)
      const portfolioCapital = portfolio.reduce((s, a) => s + a.capital_invested, 0)
      const emergencyFund    = emergency?.current_amount ?? 0
      const assetsValue      = assets.reduce((s, a) => s + (a.value - a.debt), 0)

      // Preferir dm_budget_rules se existir (override manual); caso contrário derivar de despesas reais
      const budgetRule: DmBudgetRule | null = budget ?? (rawExp.length > 0 ? ({
        needs_amt:   needsAmt,
        wants_amt:   wantsAmt,
        savings_amt: savingsAmt,
        needs_pct:   income > 0 ? needsAmt   / income : 0,
        wants_pct:   income > 0 ? wantsAmt   / income : 0,
        savings_pct: income > 0 ? savingsAmt / income : 0,
      } as DmBudgetRule) : null)

      return {
        income,
        expenses:    totalExpenses,
        savings:     savingsAmt,
        savingsRate: income > 0 ? savingsAmt / income : 0,
        freeCash:    income - totalExpenses - savingsAmt,
        netWorth:    assetsValue + portfolioValue + emergencyFund,
        portfolioValue,
        portfolioPL: portfolioValue - portfolioCapital,
        emergencyFund,
        budgetRule,
        assets,
      }
    },
  })
}
