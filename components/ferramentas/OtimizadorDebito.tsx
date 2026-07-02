import React, { useState, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCredits } from '../../hooks/useCredits'
import {
  getCreditOutstandingBalance,
  simulateExtraAmortization,
} from '../../lib/creditMath'
import type { DmCredit } from '../../types/database'
import { fmt, fmt2 } from '../../utils/format'
import StepperInput from '../ui/StepperInput'

type IoniconName = React.ComponentProps<typeof Ionicons>['name']

const KIND_LABEL: Record<string, string> = {
  VEHICLE: 'Automóvel',
  HOUSING: 'Habitação',
}

// ── Cálculo ────────────────────────────────────────────────────────────────

interface OtimizacaoResult {
  saldoDevedor:        number
  mesesRestantes:      number
  taeg:                number
  jurosPoupados:       number
  mesesEconomizados:   number
  fvInvestido:         number
  ganhoInvestimento:   number
  ganhoAmortizarAnual: number
  ganhoInvestirAnual:  number
  veredito:            'amortizar' | 'investir' | 'empate'
  diferencaAnual:      number
}

function calcularOtimizacao(
  credit: DmCredit & { balance: number; remainingMonths: number },
  extraMensal: number,
  taxaMercadoPct: number,
): OtimizacaoResult {
  const { balance, remainingMonths } = credit

  const simA = simulateExtraAmortization(
    balance, credit.interest_rate,
    credit.monthly_payment, remainingMonths, extraMensal,
  )

  const r  = taxaMercadoPct / 100 / 12
  const n  = remainingMonths
  const fv = r > 0
    ? extraMensal * (Math.pow(1 + r, n) - 1) / r
    : extraMensal * n
  const ganhoInvestimento = fv - extraMensal * n

  const anos                = n / 12
  const ganhoAmortizarAnual = anos > 0 ? simA.interestSaved  / anos : 0
  const ganhoInvestirAnual  = anos > 0 ? ganhoInvestimento   / anos : 0
  const diff                = ganhoInvestirAnual - ganhoAmortizarAnual

  return {
    saldoDevedor:      balance,
    mesesRestantes:    remainingMonths,
    taeg:              credit.interest_rate,
    jurosPoupados:     simA.interestSaved,
    mesesEconomizados: Math.round(simA.monthsSaved),
    fvInvestido:       fv,
    ganhoInvestimento,
    ganhoAmortizarAnual,
    ganhoInvestirAnual,
    // Custo certo (TAEG) >= retorno incerto (mercado) → amortizar ganha sempre
    veredito: taxaMercadoPct <= credit.interest_rate
      ? 'amortizar'
      : (Math.abs(diff) < 50 ? 'empate' : diff > 0 ? 'investir' : 'amortizar'),
    diferencaAnual: Math.abs(diff),
  }
}

// ── CreditCard (picker) ────────────────────────────────────────────────────

function CreditCard({ credit, selected, balance, remainingMonths, onPress }: {
  credit: DmCredit; selected: boolean
  balance: number; remainingMonths: number; onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: selected ? '#1a1030' : '#1e293b',
        borderRadius: 16, borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? '#8b5cf6' : '#334155',
        padding: 14, marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {KIND_LABEL[credit.kind] ?? credit.kind}
          </Text>
          <Text style={{ color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginTop: 3 }} numberOfLines={1}>
            {credit.name}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
          <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '700' }}>
            {credit.interest_rate.toFixed(2)}%
          </Text>
          <Text style={{ color: '#475569', fontSize: 9, marginTop: 1 }}>TAEG</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 20, marginTop: 12 }}>
        <View>
          <Text style={{ color: '#475569', fontSize: 10 }}>Saldo devedor</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2 }}>{fmt(balance)}</Text>
        </View>
        <View>
          <Text style={{ color: '#475569', fontSize: 10 }}>Meses restantes</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2 }}>{remainingMonths}</Text>
        </View>
        <View>
          <Text style={{ color: '#475569', fontSize: 10 }}>Prestação</Text>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2 }}>{fmt(credit.monthly_payment)}/mês</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── VerdictCard ────────────────────────────────────────────────────────────

const VerdictCard = React.memo(function VerdictCard({ result, credit, extraMensal, taxaMercado }: {
  result:      OtimizacaoResult
  credit:      DmCredit
  extraMensal: number
  taxaMercado: number
}) {
  const isAmortizar = result.veredito === 'amortizar'
  const isEmpate    = result.veredito === 'empate'

  const mainColor   = isEmpate ? '#64748b' : isAmortizar ? '#f59e0b' : '#14b8a6'
  const bgColor     = isEmpate ? '#1e293b' : isAmortizar ? '#1c1400' : '#042f2e'
  const borderColor = isEmpate ? '#33415540' : isAmortizar ? '#f59e0b30' : '#14b8a630'
  const icon: IoniconName = isEmpate
    ? 'remove-circle-outline'
    : isAmortizar ? 'shield-checkmark-outline' : 'trending-up-outline'

  const maxVal        = Math.max(result.ganhoAmortizarAnual, result.ganhoInvestirAnual, 1)
  const barAmortFlex  = Math.max(result.ganhoAmortizarAnual / maxVal, 0.03)
  const barInvestFlex = Math.max(result.ganhoInvestirAnual  / maxVal, 0.03)

  const verdictTitle =
    isEmpate    ? 'Resultado semelhante — decide pelo risco'
    : isAmortizar ? 'Amortizar é mais vantajoso'
    :               'Investir gera mais retorno'

  const tempoTexto = result.mesesRestantes < 12
    ? `${result.mesesRestantes} meses`
    : `${(result.mesesRestantes / 12).toFixed(1)} anos`

  const verdictMsg = isEmpate
    ? `Com ${fmt2(extraMensal)}/mês extra, amortizar e investir têm resultados próximos (diferença < €50/ano). Em caso de dúvida, prefere amortizar — o retorno é garantido.`
    : isAmortizar
      ? `Amortizar poupa-te ${fmt(result.jurosPoupados)} em juros garantidos e sem risco ao longo do crédito (${result.mesesEconomizados} meses mais cedo). A TAEG de ${credit.interest_rate.toFixed(2)}% supera o retorno estimado de ${taxaMercado.toFixed(1)}% do mercado.`
      : `Investir gera ${fmt(result.ganhoInvestimento)} estimados em ${tempoTexto}, superando o custo do crédito em ${fmt(result.diferencaAnual)}/ano. O retorno de ${taxaMercado.toFixed(1)}% supera a TAEG de ${credit.interest_rate.toFixed(2)}%.`

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 20, borderWidth: 1, borderColor, padding: 20, gap: 16 }}>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: mainColor + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={20} color={mainColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: mainColor, fontSize: 14, fontWeight: '800', lineHeight: 20 }}>{verdictTitle}</Text>
          <Text style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
            TAEG {credit.interest_rate.toFixed(2)}%{'  '}
            <Text style={{ color: isAmortizar ? '#f59e0b' : '#14b8a6' }}>
              {isAmortizar ? '>' : '<'}
            </Text>
            {'  '}Mercado {taxaMercado.toFixed(1)}%
          </Text>
        </View>
      </View>

      <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 21 }}>{verdictMsg}</Text>

      <View style={{ gap: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Juros poupados/ano</Text>
            <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>{fmt(result.ganhoAmortizarAnual)}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#0f172a', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ flex: barAmortFlex,     height: 8, backgroundColor: '#f59e0b' }} />
            <View style={{ flex: 1 - barAmortFlex }} />
          </View>
        </View>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Retorno estimado/ano</Text>
            <Text style={{ color: '#14b8a6', fontSize: 11, fontWeight: '700' }}>{fmt(result.ganhoInvestirAnual)}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#0f172a', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ flex: barInvestFlex,    height: 8, backgroundColor: '#14b8a6' }} />
            <View style={{ flex: 1 - barInvestFlex }} />
          </View>
        </View>
      </View>

      <View style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 14, gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#475569', fontSize: 12 }}>Crédito liquidado</Text>
          <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '600' }}>
            {result.mesesEconomizados > 0 ? `${result.mesesEconomizados} meses mais cedo` : 'sem antecipação'}
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: '#1e293b' }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#475569', fontSize: 12 }}>Valor futuro investido</Text>
          <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '600' }}>{fmt(result.fvInvestido)}</Text>
        </View>
        {!isEmpate && (
          <>
            <View style={{ height: 1, backgroundColor: '#1e293b' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#475569', fontSize: 12 }}>Vantagem anual</Text>
              <Text style={{ color: mainColor, fontSize: 14, fontWeight: '800' }}>+{fmt(result.diferencaAnual)}</Text>
            </View>
          </>
        )}
      </View>

      <Text style={{ color: '#334155', fontSize: 10, lineHeight: 15 }}>
        * Retorno de mercado é estimado e não garantido. A TAEG do crédito é certa. Consulta um consultor financeiro.
      </Text>
    </View>
  )
})

// ── Componente principal ───────────────────────────────────────────────────

export default function OtimizadorDebito() {
  const { data: credits, isLoading } = useCredits()
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [extraMensal, setExtraMensal] = useState(100)
  const [taxaMercado, setTaxaMercado] = useState(7.0)

  const creditList = credits ?? []

  // Processamento defensivo: dados corrompidos no DB retornam null em vez de crashar
  const creditData = useMemo(() => {
    try {
      return creditList.map((c) => ({ ...c, ...getCreditOutstandingBalance(c) }))
    } catch {
      return null
    }
  }, [creditList])

  const hasDataError   = creditData === null
  const safeCreditData = creditData ?? []

  useEffect(() => {
    if (!selectedId && safeCreditData.length > 0) {
      setSelectedId(safeCreditData[0].id)
    }
  }, [safeCreditData.length, selectedId])

  const selectedCredit = safeCreditData.find((c) => c.id === selectedId) ?? null

  const result = useMemo(() => {
    if (!selectedCredit || extraMensal <= 0) return null
    try {
      return calcularOtimizacao(selectedCredit, extraMensal, taxaMercado)
    } catch {
      return null
    }
  }, [selectedCredit, extraMensal, taxaMercado])

  // ── Fallback visual para dados corrompidos ─────────────────────────────
  if (hasDataError) {
    return (
      <View style={{
        backgroundColor: '#1e293b', borderRadius: 16,
        borderWidth: 1, borderColor: '#ef444440',
        padding: 28, alignItems: 'center', gap: 12,
      }}>
        <Ionicons name="warning-outline" size={36} color="#ef4444" />
        <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>
          Erro ao carregar dados do crédito
        </Text>
        <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          Os dados de um crédito estão incompletos ou corrompidos.{'\n'}
          Verifica o separador Créditos e volta a tentar.
        </Text>
      </View>
    )
  }

  return (
    <View style={{ gap: 14 }}>

      {/* ── CreditPicker ────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator color="#14b8a6" style={{ paddingVertical: 20 }} />
      ) : safeCreditData.length === 0 ? (
        <View style={{
          backgroundColor: '#1e293b', borderRadius: 16,
          borderWidth: 1, borderColor: '#334155',
          padding: 24, alignItems: 'center', gap: 10,
        }}>
          <Ionicons name="card-outline" size={32} color="#334155" />
          <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            Sem créditos registados.{'\n'}Adiciona um crédito no separador Créditos.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
            Seleciona o crédito
          </Text>
          {safeCreditData.map((c) => (
            <CreditCard
              key={c.id}
              credit={c}
              selected={c.id === selectedId}
              balance={c.balance}
              remainingMonths={c.remainingMonths}
              onPress={() => setSelectedId(c.id)}
            />
          ))}
        </>
      )}

      {/* ── Steppers ────────────────────────────────────────────────────── */}
      {safeCreditData.length > 0 && (
        <View style={{
          backgroundColor: '#1e293b', borderRadius: 20,
          borderWidth: 1, borderColor: '#334155', padding: 16, gap: 14,
        }}>
          <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' }}>
            Parâmetros da simulação
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StepperInput
              label="Capital extra mensal"
              value={extraMensal} step={50} min={50} max={5000} suffix="€"
              onChange={setExtraMensal}
              buttonWidth={40} controlHeight={46} valueFontSize={14}
            />
            <StepperInput
              label="Retorno de mercado"
              value={taxaMercado} step={0.5} min={0.5} max={20} suffix="%" decimals={1}
              onChange={setTaxaMercado}
              buttonWidth={40} controlHeight={46} valueFontSize={14}
            />
          </View>
        </View>
      )}

      {/* ── VerdictCard ─────────────────────────────────────────────────── */}
      {result && selectedCredit && (
        <VerdictCard
          result={result}
          credit={selectedCredit}
          extraMensal={extraMensal}
          taxaMercado={taxaMercado}
        />
      )}

    </View>
  )
}
