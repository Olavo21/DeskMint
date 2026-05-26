import { create } from 'zustand'
import type { DashboardSummary } from '../types'

// Dados reais do teu Excel (OneDrive) como valores iniciais
const SEED_DASHBOARD: DashboardSummary = {
  income: 1293.85,
  expenses: 798.40,
  savings: 400.00,
  savingsRate: 0.309,
  freeCash: 95.45,
  netWorth: 19879.91,
  portfolioValue: 1194.95,
  portfolioPL: 30.55,
  emergencyFund: 1897.58,
  budgetRule: {
    month: 5,
    year: 2026,
    totalIncome: 1293.85,
    needsPct: 0.5475,
    wantsPct: 0.0696,
    savingsPct: 0.3092,
    needsAmt: 708.40,
    wantsAmt: 90.00,
    savingsAmt: 400.00,
  },
}

interface DashboardStore {
  summary: DashboardSummary
  selectedMonth: number
  selectedYear: number
  setSummary: (s: DashboardSummary) => void
  setMonth: (month: number, year: number) => void
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  summary: SEED_DASHBOARD,
  selectedMonth: 5,
  selectedYear: 2026,
  setSummary: (summary) => set({ summary }),
  setMonth: (selectedMonth, selectedYear) => set({ selectedMonth, selectedYear }),
}))
