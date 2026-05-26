// ─── Espelha os modelos do schema Prisma para uso no cliente ───────────────

export type Plan = 'FREE' | 'PRO' | 'FOUNDER'
export type CommissionStatus = 'PENDING' | 'PAID' | 'CANCELLED'
export type BudgetType = 'NEEDS' | 'WANTS' | 'SAVINGS'
export type AssetType = 'ETF' | 'STOCK' | 'CRYPTO' | 'BOND' | 'OTHER'
export type AssetKind = 'VEHICLE' | 'REAL_ESTATE' | 'BANK_ACCOUNT' | 'SAVINGS' | 'OTHER'

export interface Income {
  id: string
  month: number
  year: number
  baseSalary: number
  totalNet: number
  notes?: string
}

export interface Commission {
  id: string
  description: string
  client?: string
  amount: number
  status: CommissionStatus
  earnedAt: string
  expectedAt?: string
  paidAt?: string
  notes?: string
}

export interface ExpenseCategory {
  id: string
  name: string
  type: BudgetType
  icon?: string
}

export interface Expense {
  id: string
  categoryId: string
  category?: ExpenseCategory
  description: string
  amount: number
  isFixed: boolean
  month: number
  year: number
  paidAt?: string
}

export interface BudgetRule {
  month: number
  year: number
  totalIncome: number
  needsPct: number
  wantsPct: number
  savingsPct: number
  needsAmt: number
  wantsAmt: number
  savingsAmt: number
}

export interface PortfolioAsset {
  id: string
  name: string
  ticker: string
  assetType: AssetType
  broker: string
  units: number
  avgPrice: number
  capitalInvested: number
  currentValue: number
  allocation?: number
  isExtra: boolean
  // derivado
  pl: number        // currentValue - capitalInvested
  plPct: number     // pl / capitalInvested
}

export interface Asset {
  id: string
  name: string
  type: AssetKind
  value: number
  debt: number
  notes?: string
}

export interface EmergencyFund {
  currentAmount: number
  targetMonths: number
  targetAmount?: number
  // derivado
  progressPct: number  // currentAmount / targetAmount
}

export interface RetirementScenario {
  name: string
  annualReturn: number
  projectedCapital?: number
}

export interface RetirementPlan {
  currentAge: number
  retirementAge: number
  monthlyContrib: number
  initialCapital: number
  scenarios: RetirementScenario[]
}

// Dashboard agregado
export interface DashboardSummary {
  income: number
  expenses: number
  savings: number
  savingsRate: number
  freeCash: number
  netWorth: number
  portfolioValue: number
  portfolioPL: number
  emergencyFund: number
  budgetRule: BudgetRule
}
