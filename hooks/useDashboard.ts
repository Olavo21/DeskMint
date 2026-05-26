import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import type { DmIncome, DmBudgetRule, DmPortfolioAsset, DmEmergencyFund, DmAsset } from '../types/database'

export function useDashboard(month: number, year: number) {
  const session = useAuthStore((s) => s.session)

  return useQuery({
    queryKey: ['dashboard', month, year, session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const uid = session!.user.id

      const [incomeRes, budgetRes, portfolioRes, emergencyRes, assetsRes] = await Promise.all([
        supabase.from('dm_income').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_budget_rules').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid),
        supabase.from('dm_emergency_fund').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dm_assets').select('*').eq('user_id', uid),
      ])

      const income = (incomeRes.data as DmIncome | null)?.total_net ?? 0
      const budget = budgetRes.data as DmBudgetRule | null
      const portfolio = (portfolioRes.data as DmPortfolioAsset[]) ?? []
      const emergency = emergencyRes.data as DmEmergencyFund | null
      const assets = (assetsRes.data as DmAsset[]) ?? []

      const needsAmt = budget?.needs_amt ?? 0
      const wantsAmt = budget?.wants_amt ?? 0
      const savingsAmt = budget?.savings_amt ?? 0
      const expenses = needsAmt + wantsAmt
      const portfolioValue = portfolio.reduce((s, a) => s + a.current_value, 0)
      const portfolioCapital = portfolio.reduce((s, a) => s + a.capital_invested, 0)
      const emergencyFund = emergency?.current_amount ?? 0
      const assetsValue = assets.reduce((s, a) => s + a.value, 0)

      return {
        income,
        expenses,
        savings: savingsAmt,
        savingsRate: budget?.savings_pct ?? 0,
        freeCash: income - expenses - savingsAmt,
        netWorth: assetsValue + portfolioValue + emergencyFund,
        portfolioValue,
        portfolioPL: portfolioValue - portfolioCapital,
        emergencyFund,
        budgetRule: budget,
      }
    },
  })
}
