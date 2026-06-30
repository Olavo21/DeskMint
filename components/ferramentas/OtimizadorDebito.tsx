import { useState, useMemo, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useCredits } from '../../hooks/useCredits'
import {
  getCreditOutstandingBalance,
  simulateExtraAmortization,
} from '../../lib/creditMath'
import type { DmCredit } from '../../types/database'

// ── Formatação ─────────────────────────────────────────────────────────────

const fmt  = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmt2 = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

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

// ── StepperInput ───────────────────────────────────────────────────────────

function StepperInput({ label, value, step, min, max, suffix, decimals = 0, onChange }: {
  label: string; value: number; step: number; min: number; max: number
  suffix: string; decimals?: number; onChange: (v: number) => void
}) {
  const dec = () => onChange(parseFloat(Math.max(min, value - step).toFixed(decimals)))
  const inc = () => onChange(parseFloat(Math.min(max, value + step).toFixed(decimals)))
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 6 }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12,
        borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
      }}>
        <TouchableOpacity
          onPress={dec}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
          style={{ width: 40, height: 46, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1e293b' }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 22, lineHeight: 24 }}>−</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ color: '#2dd4bf', fontSize: 14, fontWeight: '700' }}>
            {value.toFixed(decimals)}{suffix}
          </Text>
        </View>
        <TouchableOpacity
          onPress={inc}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
          style={{ width: 40, height: 46, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1e293b' }}
        >
          <Text style={{ color: '#2dd4bf', fontSize: 22, lineHeight: 24 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
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

function VerdictCard({ result, credit, extraMensal, taxaMercado }: {
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
  const icon: any   = isEmpate ? 'remove-circle-outline'
    : isAmortizar ? 'shield-checkmark-outline' : 'trending-up-outline'

  const maxVal       = Math.max(result.ganhoAmortizarAnual, result.ganhoInvestirAnual, 1)
  const barAmortFlex = Math.max(result.ganhoAmortizarAnual / maxVal, 0.03)
  const barInvestFlex = Math.max(result.ganhoInvestirAnual / maxVal, 0.03)

  const verdictTitle =
    isEmpate    ? 'Resultado semelhante — decide pelo risco'
    : isAmortizar ? 'Amortizar é mais vantajoso'
    :               'Investir gera mais retorno'

  const verdictMsg = isEmpate
    ? `Com ${fmt2(extraMensal)}/mês extra, amortizar e investir têm resultados próximos (diferença < €50/ano). Em caso de dúvida, prefere amortizar — o retorno é garantido.`
    : isAmortizar
      ? `Amortizar poupa-te ${fmt(result.jurosPoupados)} em juros garantidos e sem risco ao longo do crédito (${result.mesesEconomizados} meses mais cedo). A TAEG de ${credit.interest_rate.toFixed(2)}% supera o retorno estimado de ${taxaMercado.toFixed(1)}% do mercado.`
      : `Investir gera ${fmt(result.ganhoInvestimento)} estimados em ${Math.round(result.mesesRestantes / 12)} anos, superando o custo do crédito em ${fmt(result.diferencaAnual)}/ano. O retorno de ${taxaMercado.toFixed(1)}% supera a TAEG de ${credit.interest_rate.toFixed(2)}%.`

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 20, borderWidth: 1, borderColor, padding: 20, gap: 16 }}>

      {/* Header */}
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

      {/* Mensagem */}
      <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 21 }}>{verdictMsg}</Text>

      {/* Barras comparativas */}
      <View style={{ gap: 10 }}>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Juros poupados/ano</Text>
            <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>{fmt(result.ganhoAmortizarAnual)}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#0f172a', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ flex: barAmortFlex, height: 8, backgroundColor: '#f59e0b' }} />
            <View style={{ flex: 1 - barAmortFlex }} />
          </View>
        </View>
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Retorno estimado/ano</Text>
            <Text style={{ color: '#14b8a6', fontSize: 11, fontWeight: '700' }}>{fmt(result.ganhoInvestirAnual)}</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#0f172a', borderRadius: 4, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ flex: barInvestFlex, height: 8, backgroundColor: '#14b8a6' }} />
            <View style={{ flex: 1 - barInvestFlex }} />
          </View>
        </View>
      </View>

      {/* Rodapé com métricas */}
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
}

// ── Componente principal ───────────────────────────────────────────────────

export default function OtimizadorDebito() {
  const { data: credits, isLoading } = useCredits()
  const [selectedId,  setSelectedId]  = useState<string | null>(null)
  const [extraMensal, setExtraMensal] = useState(100)
  const [taxaMercado, setTaxaMercado] = useState(7.0)

  const creditList = credits ?? []

  // Auto-selecciona o primeiro crédito quando os dados carregam
  useEffect(() => {
    if (!selectedId && creditList.length > 0) {
      setSelectedId(creditList[0].id)
    }
  }, [creditList.length])

  const creditData = useMemo(
    () => creditList.map((c) => ({ ...c, ...getCreditOutstandingBalance(c) })),
    [creditList],
  )

  const selectedCredit = creditData.find((c) => c.id === selectedId) ?? null

  const result = useMemo(
    () => selectedCredit && extraMensal > 0
      ? calcularOtimizacao(selectedCredit, extraMensal, taxaMercado)
      : null,
    [selectedCredit, extraMensal, taxaMercado],
  )

  return (
    <View style={{ gap: 14 }}>

      {/* ── CreditPicker ────────────────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator color="#14b8a6" style={{ paddingVertical: 20 }} />
      ) : creditList.length === 0 ? (
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
          {creditData.map((c) => (
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
      {creditList.length > 0 && (
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
            />
            <StepperInput
              label="Retorno de mercado"
              value={taxaMercado} step={0.5} min={0.5} max={20} suffix="%" decimals={1}
              onChange={setTaxaMercado}
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
