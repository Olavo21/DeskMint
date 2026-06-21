import type { DmCredit } from '../types/database'

export function monthlyRate(annualRatePct: number) {
  return annualRatePct / 100 / 12
}

export function monthsElapsed(snapshotDate: string | Date, today: Date = new Date()) {
  const d = typeof snapshotDate === 'string' ? new Date(snapshotDate) : snapshotDate
  const months = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth())
  return Math.max(months - (today.getDate() < d.getDate() ? 1 : 0), 0)
}

export function effectiveRemainingMonths(
  remainingMonthsSnapshot: number,
  snapshotDate: string,
  today: Date = new Date()
) {
  return Math.max(remainingMonthsSnapshot - monthsElapsed(snapshotDate, today), 0)
}

/** Valor presente das prestações que faltam pagar (saldo em dívida). */
export function calcOutstandingBalance(monthlyPayment: number, annualRatePct: number, remainingMonths: number) {
  if (remainingMonths <= 0) return 0
  const r = monthlyRate(annualRatePct)
  if (r === 0) return monthlyPayment * remainingMonths
  return monthlyPayment * (1 - Math.pow(1 + r, -remainingMonths)) / r
}

/** Prestação mensal necessária para liquidar `balance` em `months` a uma taxa anual dada. */
export function calcMonthlyPayment(balance: number, annualRatePct: number, months: number) {
  if (months <= 0) return balance
  const r = monthlyRate(annualRatePct)
  if (r === 0) return balance / months
  return balance * r / (1 - Math.pow(1 + r, -months))
}

/** Nº de meses para liquidar um saldo a uma prestação dada. Infinity se a prestação nem cobre os juros. */
export function calcPayoffMonths(balance: number, annualRatePct: number, monthlyPayment: number) {
  if (balance <= 0) return 0
  const r = monthlyRate(annualRatePct)
  if (r === 0) return balance / monthlyPayment
  if (monthlyPayment <= balance * r) return Infinity
  return -Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r)
}

export function getCreditOutstandingBalance(credit: DmCredit, today: Date = new Date()) {
  const remaining = effectiveRemainingMonths(credit.remaining_months_snapshot, credit.snapshot_date, today)
  return {
    remainingMonths: remaining,
    balance: calcOutstandingBalance(credit.monthly_payment, credit.interest_rate, remaining),
  }
}

export type AmortizationSimulation = {
  newPayoffMonths: number
  monthsSaved: number
  interestSaved: number
}

/** Simula o impacto de pagar `extraMonthly` a mais por mês, a partir do saldo atual. */
export function simulateExtraAmortization(
  balance: number,
  annualRatePct: number,
  monthlyPayment: number,
  remainingMonths: number,
  extraMonthly: number
): AmortizationSimulation {
  if (extraMonthly <= 0 || balance <= 0 || remainingMonths <= 0) {
    return { newPayoffMonths: remainingMonths, monthsSaved: 0, interestSaved: 0 }
  }

  const baselineInterest = monthlyPayment * remainingMonths - balance
  const newPayoffMonths = calcPayoffMonths(balance, annualRatePct, monthlyPayment + extraMonthly)

  if (!Number.isFinite(newPayoffMonths)) {
    return { newPayoffMonths: remainingMonths, monthsSaved: 0, interestSaved: 0 }
  }

  const newInterest = (monthlyPayment + extraMonthly) * newPayoffMonths - balance
  return {
    newPayoffMonths,
    monthsSaved: remainingMonths - newPayoffMonths,
    interestSaved: Math.max(baselineInterest - newInterest, 0),
  }
}
