export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      dm_credits: {
        Row: {
          created_at: string
          id: string
          interest_rate: number
          kind: Database["public"]["Enums"]["dm_credit_kind"]
          monthly_payment: number
          name: string
          principal_amount: number
          rate_type: Database["public"]["Enums"]["dm_credit_rate_type"]
          remaining_months_snapshot: number
          snapshot_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rate: number
          kind: Database["public"]["Enums"]["dm_credit_kind"]
          monthly_payment: number
          name: string
          principal_amount: number
          rate_type?: Database["public"]["Enums"]["dm_credit_rate_type"]
          remaining_months_snapshot: number
          snapshot_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_rate?: number
          kind?: Database["public"]["Enums"]["dm_credit_kind"]
          monthly_payment?: number
          name?: string
          principal_amount?: number
          rate_type?: Database["public"]["Enums"]["dm_credit_rate_type"]
          remaining_months_snapshot?: number
          snapshot_date?: string
          updated_at?: string
          user_id?: string
        }
      }
      dm_assets: {
        Row: {
          created_at: string
          credit_id: string | null
          debt: number
          id: string
          name: string
          notes: string | null
          type: Database["public"]["Enums"]["dm_asset_kind"]
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          credit_id?: string | null
          debt?: number
          id?: string
          name: string
          notes?: string | null
          type: Database["public"]["Enums"]["dm_asset_kind"]
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          credit_id?: string | null
          debt?: number
          id?: string
          name?: string
          notes?: string | null
          type?: Database["public"]["Enums"]["dm_asset_kind"]
          updated_at?: string
          user_id?: string
          value?: number
        }
      }
      dm_budget_rules: {
        Row: {
          id: string
          month: number
          needs_amt: number
          needs_pct: number
          savings_amt: number
          savings_pct: number
          total_income: number
          user_id: string
          wants_amt: number
          wants_pct: number
          year: number
        }
        Insert: {
          id?: string
          month: number
          needs_amt: number
          needs_pct: number
          savings_amt: number
          savings_pct: number
          total_income: number
          user_id: string
          wants_amt: number
          wants_pct: number
          year: number
        }
        Update: {
          id?: string
          month?: number
          needs_amt?: number
          needs_pct?: number
          savings_amt?: number
          savings_pct?: number
          total_income?: number
          user_id?: string
          wants_amt?: number
          wants_pct?: number
          year?: number
        }
      }
      dm_commissions: {
        Row: {
          amount: number
          client: string | null
          created_at: string
          description: string
          earned_at: string
          expected_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["dm_commission_status"]
          updated_at: string
          user_id: string
          type_id: string | null
          service_date: string | null
          quantity: number
          unit_value: number | null
        }
        Insert: {
          amount: number
          client?: string | null
          created_at?: string
          description: string
          earned_at: string
          expected_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["dm_commission_status"]
          updated_at?: string
          user_id: string
          type_id?: string | null
          service_date?: string | null
          quantity?: number
          unit_value?: number | null
        }
        Update: {
          amount?: number
          client?: string | null
          created_at?: string
          description?: string
          earned_at?: string
          expected_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["dm_commission_status"]
          updated_at?: string
          user_id?: string
          type_id?: string | null
          service_date?: string | null
          quantity?: number
          unit_value?: number | null
        }
      }
      dm_emergency_fund: {
        Row: {
          current_amount: number
          id: string
          target_amount: number | null
          target_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_amount: number
          id?: string
          target_amount?: number | null
          target_months?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_amount?: number
          id?: string
          target_amount?: number | null
          target_months?: number
          updated_at?: string
          user_id?: string
        }
      }
      dm_recurring_expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_fixed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          is_fixed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_fixed?: boolean
          updated_at?: string
          user_id?: string
        }
      }
      dm_expense_categories: {
        Row: {
          icon: string | null
          id: string
          monthly_limit: number | null
          name: string
          type: Database["public"]["Enums"]["dm_budget_type"]
          user_id: string
        }
        Insert: {
          icon?: string | null
          id?: string
          monthly_limit?: number | null
          name: string
          type: Database["public"]["Enums"]["dm_budget_type"]
          user_id: string
        }
        Update: {
          icon?: string | null
          id?: string
          monthly_limit?: number | null
          name?: string
          type?: Database["public"]["Enums"]["dm_budget_type"]
          user_id?: string
        }
      }
      dm_expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          description: string
          id: string
          is_fixed: boolean
          month: number
          paid_at: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          description: string
          id?: string
          is_fixed?: boolean
          month: number
          paid_at?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          description?: string
          id?: string
          is_fixed?: boolean
          month?: number
          paid_at?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
      }
      dm_income: {
        Row: {
          base_salary: number
          created_at: string
          id: string
          month: number
          notes: string | null
          total_net: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          base_salary: number
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          total_net: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          base_salary?: number
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          total_net?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
      }
      dm_portfolio_assets: {
        Row: {
          allocation: number | null
          asset_type: Database["public"]["Enums"]["dm_asset_type"]
          avg_price: number
          broker: string
          capital_invested: number
          created_at: string
          current_value: number
          id: string
          is_extra: boolean
          last_updated: string
          name: string
          ticker: string
          units: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation?: number | null
          asset_type?: Database["public"]["Enums"]["dm_asset_type"]
          avg_price?: number
          broker?: string
          capital_invested: number
          created_at?: string
          current_value: number
          id?: string
          is_extra?: boolean
          last_updated?: string
          name: string
          ticker: string
          units?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation?: number | null
          asset_type?: Database["public"]["Enums"]["dm_asset_type"]
          avg_price?: number
          broker?: string
          capital_invested?: number
          created_at?: string
          current_value?: number
          id?: string
          is_extra?: boolean
          last_updated?: string
          name?: string
          ticker?: string
          units?: number
          updated_at?: string
          user_id?: string
        }
      }
      dm_portfolio_snapshots: {
        Row: {
          date: string
          id: string
          portfolio_asset_id: string
          price: number
          total_value: number
        }
        Insert: {
          date: string
          id?: string
          portfolio_asset_id: string
          price?: number
          total_value: number
        }
        Update: {
          date?: string
          id?: string
          portfolio_asset_id?: string
          price?: number
          total_value?: number
        }
      }
      dm_profiles: {
        Row: {
          avatar: string | null
          birth_year: number | null
          created_at: string
          currency: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["dm_plan"]
          retirement_age: number
          updated_at: string
          investor_type: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'SPECULATIVE' | null
          invest_goal: 'RETIREMENT' | 'WEALTH' | 'INCOME' | 'EDUCATION' | 'EMERGENCY' | 'OTHER' | null
          time_horizon: 'SHORT' | 'MEDIUM' | 'LONG' | null
          monthly_invest: number | null
          onboarding_done: boolean
          founder_number: number | null
          plan_expires_at: string | null
          plan_updated_at: string
        }
        Insert: {
          avatar?: string | null
          birth_year?: number | null
          created_at?: string
          currency?: string
          id: string
          name: string
          plan?: Database["public"]["Enums"]["dm_plan"]
          retirement_age?: number
          updated_at?: string
          investor_type?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'SPECULATIVE' | null
          invest_goal?: 'RETIREMENT' | 'WEALTH' | 'INCOME' | 'EDUCATION' | 'EMERGENCY' | 'OTHER' | null
          time_horizon?: 'SHORT' | 'MEDIUM' | 'LONG' | null
          monthly_invest?: number | null
          onboarding_done?: boolean
          founder_number?: number | null
          plan_expires_at?: string | null
          plan_updated_at?: string
        }
        Update: {
          avatar?: string | null
          birth_year?: number | null
          created_at?: string
          currency?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["dm_plan"]
          retirement_age?: number
          updated_at?: string
          investor_type?: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'SPECULATIVE' | null
          invest_goal?: 'RETIREMENT' | 'WEALTH' | 'INCOME' | 'EDUCATION' | 'EMERGENCY' | 'OTHER' | null
          time_horizon?: 'SHORT' | 'MEDIUM' | 'LONG' | null
          monthly_invest?: number | null
          onboarding_done?: boolean
          founder_number?: number | null
          plan_expires_at?: string | null
          plan_updated_at?: string
        }
      }
      dm_retirement_plans: {
        Row: {
          created_at: string
          current_age: number
          id: string
          initial_capital: number
          monthly_contrib: number
          retirement_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_age: number
          id?: string
          initial_capital: number
          monthly_contrib: number
          retirement_age: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_age?: number
          id?: string
          initial_capital?: number
          monthly_contrib?: number
          retirement_age?: number
          updated_at?: string
          user_id?: string
        }
      }
      dm_retirement_scenarios: {
        Row: {
          annual_return: number
          id: string
          name: string
          plan_id: string
          projected_capital: number | null
        }
        Insert: {
          annual_return: number
          id?: string
          name: string
          plan_id: string
          projected_capital?: number | null
        }
        Update: {
          annual_return?: number
          id?: string
          name?: string
          plan_id?: string
          projected_capital?: number | null
        }
      }
    }
    Enums: {
      dm_credit_kind: "VEHICLE" | "HOUSING"
      dm_credit_rate_type: "FIXED" | "VARIABLE"
      dm_asset_kind: "VEHICLE" | "REAL_ESTATE" | "BANK_ACCOUNT" | "SAVINGS" | "OTHER"
      dm_asset_type: "ETF" | "STOCK" | "CRYPTO" | "BOND" | "OTHER"
      dm_budget_type: "NEEDS" | "WANTS" | "SAVINGS"
      dm_commission_status: "PENDING" | "TO_PAY" | "PAID" | "CANCELLED"
      dm_plan: "FREE" | "PRO" | "FOUNDER"
    }
  }
}

// Atalhos úteis
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

// Tipo manual para dm_commission_types (adicionado após geração inicial)
export type DmCommissionType = {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string
}

export type DmCommissionTypeInsert = {
  id?: string
  user_id: string
  name: string
  icon?: string | null
  color?: string
}

// Tipos concretos das tabelas DeskMint
export type DmProfile            = Tables<"dm_profiles">
export type DmIncome             = Tables<"dm_income">
export type DmCommission         = Tables<"dm_commissions">
export type DmExpenseCategory    = Tables<"dm_expense_categories">
export type DmExpense            = Tables<"dm_expenses">
export type DmRecurringExpense   = Tables<"dm_recurring_expenses">
export type DmBudgetRule         = Tables<"dm_budget_rules">
export type DmPortfolioAsset     = Tables<"dm_portfolio_assets">
export type DmPortfolioSnapshot  = Tables<"dm_portfolio_snapshots">
export type DmAsset              = Tables<"dm_assets">
export type DmCredit             = Tables<"dm_credits">
export type DmEmergencyFund      = Tables<"dm_emergency_fund">
export type DmRetirementPlan     = Tables<"dm_retirement_plans">
export type DmRetirementScenario = Tables<"dm_retirement_scenarios">
