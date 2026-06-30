// ── Tipos ──────────────────────────────────────────────────────────────────

export interface TrianguloInput {
  liquidez:      number   // soma das contas BANK_ACCOUNT
  emergencia:    number   // emergency_fund.current_amount
  investimento:  number   // portfolio totalValue
  despesaMensal: number   // input do utilizador
  tetoDiaADia:   number   // buffer ideal (ex: 1 500 €)
}

export interface TrianguloResult {
  alvoEmergencia:   number            // despesaMensal × 6
  alvoDiaADia:      number            // = tetoDiaADia
  desvioLiquidez:   number            // liquidez − alvoDiaADia  (neg = falta)
  desvioEmergencia: number            // emergencia − alvoEmergencia (neg = falta)
  excessoLiquidez:  number            // max(0, desvioLiquidez)
  saudeLiquidez:    'baixo' | 'ok' | 'alto'
  saudeEmergencia:  'baixo' | 'ok'
  prioridade:       1 | 2 | 3        // 1=liquidez · 2=emergência · 3=investir
  instrucoes:       string[]
}

// ── Formatação interna ────────────────────────────────────────────────────

function f(v: number): string {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

// ── calcularEstruturaTriangulo ────────────────────────────────────────────

export function calcularEstruturaTriangulo(input: TrianguloInput): TrianguloResult {
  const { liquidez, emergencia, investimento, despesaMensal, tetoDiaADia } = input

  const alvoEmergencia = despesaMensal * 6
  const alvoDiaADia    = tetoDiaADia

  const desvioLiquidez   = liquidez   - alvoDiaADia
  const desvioEmergencia = emergencia - alvoEmergencia
  const excessoLiquidez  = Math.max(0, desvioLiquidez)
  const mesesEmergencia  = despesaMensal > 0 ? Math.floor(emergencia / despesaMensal) : 0

  const saudeLiquidez: TrianguloResult['saudeLiquidez'] =
    desvioLiquidez < 0           ? 'baixo'
    : desvioLiquidez > alvoDiaADia ? 'alto'
    :                               'ok'

  const saudeEmergencia: TrianguloResult['saudeEmergencia'] =
    desvioEmergencia < 0 ? 'baixo' : 'ok'

  const instrucoes: string[] = []
  let prioridade: 1 | 2 | 3

  // ── Prioridade 1: liquidez abaixo do teto ─────────────────────────────
  if (desvioLiquidez < 0) {
    prioridade = 1
    const falta = Math.abs(desvioLiquidez)
    instrucoes.push(
      `O teu buffer diário está em ${f(liquidez)} — faltam ${f(falta)} para o teto de segurança de ${f(alvoDiaADia)}.`,
    )
    instrucoes.push(
      'Reforça a conta bancária antes de qualquer outra alocação. Reduz despesas variáveis ou transfere uma poupança temporária.',
    )

  // ── Prioridade 2: emergência incompleta ───────────────────────────────
  } else if (desvioEmergencia < 0) {
    prioridade = 2
    const falta = Math.abs(desvioEmergencia)
    instrucoes.push(
      `Buffer diário OK. O fundo de emergência cobre ${mesesEmergencia} meses — o alvo são 6 meses (${f(alvoEmergencia)}). Faltam ${f(falta)}.`,
    )
    if (excessoLiquidez > 0) {
      instrucoes.push(
        `Transfere já os ${f(excessoLiquidez)} de excedente da conta bancária para o fundo de emergência.`,
      )
      const restante = falta - excessoLiquidez
      if (restante > 0) {
        instrucoes.push(`Após essa transferência, ainda faltam ${f(restante)} — aumenta o aporte mensal de emergência.`)
      } else {
        instrucoes.push('Com essa transferência, o fundo de emergência fica completo! 🎉')
      }
    } else {
      instrucoes.push(
        `Aumenta o aporte mensal ao fundo de emergência até atingires os ${f(alvoEmergencia)} (${f(despesaMensal)}/mês × 6).`,
      )
    }

  // ── Prioridade 3: tudo protegido — investir ───────────────────────────
  } else {
    prioridade = 3
    instrucoes.push(
      `Fundo de Emergência seguro — ${f(emergencia)} · ${mesesEmergencia} meses de cobertura. Triângulo financeiro equilibrado.`,
    )
    if (excessoLiquidez > 0) {
      instrucoes.push(
        `Tens ${f(excessoLiquidez)} de excedente na conta bancária. Aloca este valor no teu portfólio de investimentos.`,
      )
    }
    instrucoes.push(
      `Portfólio atual: ${f(investimento)}. Mantém os aportes mensais e reinveste para acelerar os juros compostos.`,
    )
  }

  return {
    alvoEmergencia,
    alvoDiaADia,
    desvioLiquidez,
    desvioEmergencia,
    excessoLiquidez,
    saudeLiquidez,
    saudeEmergencia,
    prioridade,
    instrucoes,
  }
}
