import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getCreditOutstandingBalance } from '../lib/creditMath'
import type { DmIncome, DmBudgetRule, DmPortfolioAsset, DmEmergencyFund, DmAsset, DmCredit } from '../types/database'

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

      const [incomeRes, budgetRes, portfolioRes, emergencyRes, assetsRes, creditsRes, expensesRes] = await Promise.all([
        supabase.from('dm_income').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_budget_rules').select('*').eq('user_id', uid).eq('month', month).eq('year', year).maybeSingle(),
        supabase.from('dm_portfolio_assets').select('*').eq('user_id', uid),
        supabase.from('dm_emergency_fund').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dm_assets').select('*').eq('user_id', uid),
        supabase.from('dm_credits').select('*').eq('user_id', uid),
        supabase.from('dm_expenses')
          .select('amount, is_fixed, dm_expense_categories(type)')
          .eq('user_id', uid)
          .eq('month', month)
          .eq('year', year),
      ])

      const results = [incomeRes, budgetRes, portfolioRes, emergencyRes, assetsRes, creditsRes, expensesRes]
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error

      const income    = (incomeRes.data as DmIncome | null)?.total_net ?? 0
      const budget    = budgetRes.data as DmBudgetRule | null
      const portfolio = (portfolioRes.data as DmPortfolioAsset[]) ?? []
      const emergency = emergencyRes.data as DmEmergencyFund | null
      const assets    = (assetsRes.data as DmAsset[]) ?? []
      const credits   = (creditsRes.data as DmCredit[]) ?? []
      const rawExp    = (expensesRes.data ?? []) as RawExpense[]

      // Totais reais calculados directamente de dm_expenses
      const needsAmt   = rawExp.filter((e) => e.dm_expense_categories?.type === 'NEEDS').reduce((s, e) => s + e.amount, 0)
      const wantsAmt   = rawExp.filter((e) => e.dm_expense_categories?.type === 'WANTS').reduce((s, e) => s + e.amount, 0)
      const savingsAmt = rawExp.filter((e) => e.dm_expense_categories?.type === 'SAVINGS').reduce((s, e) => s + e.amount, 0)
      const totalExpenses = needsAmt + wantsAmt

      const portfolioValue   = portfolio.reduce((s, a) => s + a.current_value, 0)
      const portfolioCapital = portfolio.reduce((s, a) => s + a.capital_invested, 0)
      const emergencyFund    = emergency?.current_amount ?? 0
      const totalCreditDebt  = credits.reduce((s, c) => s + getCreditOutstandingBalance(c).balance, 0)

      // Para um asset vinculado a um crédito (ex: carro financiado), a dívida
      // apresentada deixa de ser o valor estático guardado e passa a ser o
      // saldo em dívida real desse crédito — desce automaticamente mês a mês
      // conforme as prestações são pagas, sem qualquer edição manual.
      const creditsById = new Map(credits.map((c) => [c.id, c]))
      const assetsWithLiveDebt = assets.map((a) => {
        const linkedCredit = a.credit_id ? creditsById.get(a.credit_id) : undefined
        const effectiveDebt = linkedCredit ? getCreditOutstandingBalance(linkedCredit).balance : a.debt
        return { ...a, effectiveDebt, linkedCredit }
      })
      const assetsValue = assetsWithLiveDebt.reduce((s, a) => s + (a.value - a.effectiveDebt), 0)

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
        expenses:        totalExpenses,
        savings:         savingsAmt,
        savingsRate:     income > 0 ? savingsAmt / income : 0,
        freeCash:        income - totalExpenses - savingsAmt,
        availableBalance: income - totalExpenses,
        netWorth:    assetsValue + portfolioValue + emergencyFund - totalCreditDebt,
        portfolioValue,
        portfolioPL: portfolioValue - portfolioCapital,
        emergencyFund,
        totalCreditDebt,
        budgetRule,
        assets: assetsWithLiveDebt,
      }
    },
  })
}
