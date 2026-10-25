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
  /** Meses inteiros até liquidar com o extra; nunca 0 enquanto houver dívida. */
  newPayoffMonths: number
  monthsSaved: number
  interestSaved: number
  /** Juros que faltam pagar sem extra: é também o que se poupa liquidando hoje. */
  baselineInterest: number
  /** Prestação + extra cobrem a dívida e os juros do primeiro mês. */
  paidOffFirstMonth: boolean
}

// Abaixo disto (meio cêntimo) o saldo conta como liquidado: o saldo vem de um
// valor atual calculado, e a última prestação deixa sempre um resto de vírgula.
const PAID_OFF_EPSILON = 0.005

/** Juros pagos e meses até liquidar, mês a mês: juros sobre o saldo, depois o pagamento. */
function runAmortization(balance: number, r: number, payment: number, maxMonths: number) {
  let saldo = balance
  let interest = 0
  let months = 0
  while (saldo > PAID_OFF_EPSILON && months < maxMonths) {
    const juros = saldo * r
    interest += juros
    saldo += juros - Math.min(payment, saldo + juros)
    months++
  }
  return { months, interest }
}

/**
 * Simula o impacto de pagar `extraMonthly` a mais por mês, a partir do saldo atual.
 *
 * Mês a mês, e não pela fórmula fechada com logaritmos: com um extra enorme a
 * fração rB/(P+E) arredondava para 0, o prazo dava 0 meses, os "juros novos"
 * davam −saldo e a poupança mostrava o total das prestações (738,32 € num
 * crédito com 10,22 € de juros por pagar, 25 out 2026). O ciclo tem no máximo
 * `remainingMonths` voltas, e a poupança fica limitada aos juros que faltam.
 */
export function simulateExtraAmortization(
  balance: number,
  annualRatePct: number,
  monthlyPayment: number,
  remainingMonths: number,
  extraMonthly: number
): AmortizationSimulation {
  const r = monthlyRate(annualRatePct)
  const months = Math.max(Math.round(remainingMonths), 0)
  const baselineInterest = balance > 0 && months > 0
    ? runAmortization(balance, r, monthlyPayment, months).interest
    : 0

  if (!(extraMonthly > 0) || balance <= 0 || months <= 0) {
    return { newPayoffMonths: months, monthsSaved: 0, interestSaved: 0, baselineInterest, paidOffFirstMonth: false }
  }

  const sim = runAmortization(balance, r, monthlyPayment + extraMonthly, months)
  const newPayoffMonths = Math.max(sim.months, 1)
  return {
    newPayoffMonths,
    monthsSaved: Math.max(months - newPayoffMonths, 0),
    interestSaved: Math.min(Math.max(baselineInterest - sim.interest, 0), baselineInterest),
    baselineInterest,
    paidOffFirstMonth: newPayoffMonths === 1,
  }
}
