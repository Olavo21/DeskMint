import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import {
  calcWeightedRate,
  projectFIRE,
  type ProjectionPoint,
  type ProjectionResult,
} from '../../utils/fireMath'

// ── Formatação ─────────────────────────────────────────────────────────────

const fmt  = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const fmt2 = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const pct  = (v: number) => `${(v * 100).toFixed(1)}%`

const MILESTONE_AGES = [30, 35, 40, 45, 50, 55, 60]

// ── StepperInput ───────────────────────────────────────────────────────────

function StepperInput({ label, value, step, min, max, suffix, decimals = 0, onChange }: {
  label: string; value: number; step: number; min: number; max: number
  suffix: string; decimals?: number; onChange: (v: number) => void
}) {
  const dec = () => onChange(parseFloat(Math.max(min, value - step).toFixed(decimals)))
  const inc = () => onChange(parseFloat(Math.min(max, value + step).toFixed(decimals)))
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#64748b', fontSize: 10, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0f172a', borderRadius: 12,
        borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
      }}>
        <TouchableOpacity
          onPress={dec}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}
          style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1e293b' }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 20, lineHeight: 22 }}>−</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: '#2dd4bf', fontSize: 13, fontWeight: '700' }}>
            {value.toFixed(decimals)}{suffix}
          </Text>
        </View>
        <TouchableOpacity
          onPress={inc}
          hitSlop={{ top: 8, bottom: 8, left: 0, right: 8 }}
          style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1e293b' }}
        >
          <Text style={{ color: '#2dd4bf', fontSize: 20, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── VerdictCard ────────────────────────────────────────────────────────────

function VerdictCard({ result, targetAge, despesa }: {
  result:    ProjectionResult
  targetAge: number
  despesa:   number
}) {
  const ok         = result.reachedByTargetAge
  const mainColor  = ok ? '#14b8a6' : '#f59e0b'
  const bgColor    = ok ? '#042f2e' : '#1c1400'
  const borderColor = ok ? '#14b8a630' : '#f59e0b30'
  const icon: any  = ok ? 'checkmark-circle' : 'alert-circle-outline'

  return (
    <View style={{ backgroundColor: bgColor, borderRadius: 20, borderWidth: 1, borderColor, padding: 20, gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: mainColor + '20', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={20} color={mainColor} />
        </View>
        <Text style={{ color: mainColor, fontSize: 14, fontWeight: '800', flex: 1, lineHeight: 20 }}>
          {ok ? 'Independência Financeira Garantida ✓' : 'Meta não atingida ao ritmo atual'}
        </Text>
      </View>

      {/* Mensagem principal */}
      {ok ? (
        <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 21 }}>
          Ao ritmo atual, atinges a Independência Financeira aos{' '}
          <Text style={{ color: '#2dd4bf', fontWeight: '700' }}>{result.fireAge} anos</Text>
          {' '}com um portfólio de{' '}
          <Text style={{ color: '#2dd4bf', fontWeight: '700' }}>{fmt(result.valueAtTargetAge)}</Text>
          , cobrindo os teus <Text style={{ color: '#2dd4bf', fontWeight: '700' }}>{fmt2(despesa)}/mês</Text>
          {' '}na reforma (retirada segura de {fmt2(result.monthlyWithdrawal)}/mês).
        </Text>
      ) : (
        <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 21 }}>
          Aos <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{targetAge} anos</Text>
          , o teu portfólio estará em{' '}
          <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{fmt(result.valueAtTargetAge)}</Text>
          {' '}(meta: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{fmt(result.fireNumber)}</Text>
          ).{result.neededMonthlyContrib
            ? ` Para atingires a IF aos ${targetAge} anos, precisas de ajustar o aporte para ${fmt(result.neededMonthlyContrib)}/mês.`
            : ' Considera aumentar o aporte mensal ou estender o prazo.'}
        </Text>
      )}

      {/* Métricas chave */}
      <View style={{ backgroundColor: '#0f172a', borderRadius: 14, padding: 14, gap: 8 }}>
        {[
          { label: 'Número FIRE',        value: fmt(result.fireNumber),        color: '#e2e8f0' },
          { label: 'Retirada segura/mês', value: fmt2(result.monthlyWithdrawal), color: '#2dd4bf' },
          { label: 'Valor aos ' + targetAge + ' anos', value: fmt(result.valueAtTargetAge), color: ok ? '#2dd4bf' : '#fbbf24' },
          ...(result.fireAge ? [{ label: 'Ano de IF projetado', value: `${result.fireAge} anos`, color: '#2dd4bf' }] : []),
          ...(result.neededMonthlyContrib ? [{ label: 'Aporte sugerido', value: fmt(result.neededMonthlyContrib) + '/mês', color: '#f59e0b' }] : []),
        ].map((row, i, arr) => (
          <View key={row.label}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
              <Text style={{ color: '#475569', fontSize: 12 }}>{row.label}</Text>
              <Text style={{ color: row.color, fontSize: 13, fontWeight: '700' }}>{row.value}</Text>
            </View>
            {i < arr.length - 1 && <View style={{ height: 1, backgroundColor: '#1e293b', marginTop: 6 }} />}
          </View>
        ))}
      </View>
    </View>
  )
}

// ── MilestonesTable ────────────────────────────────────────────────────────

function MilestonesTable({ points, currentAge, fireAge }: {
  points:     ProjectionPoint[]
  currentAge: number
  fireAge:    number | null
}) {
  const milestones = MILESTONE_AGES
    .filter((age) => age > currentAge && age <= currentAge + 50)
    .map((age) => points.find((p) => p.age === age))
    .filter((p): p is ProjectionPoint => !!p)

  if (milestones.length === 0) return null

  return (
    <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 10, gap: 4 }}>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', width: 40 }}>IDADE</Text>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', flex: 1, textAlign: 'right' }}>INVESTIDO</Text>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', flex: 1, textAlign: 'right' }}>TOTAL C/ JUROS</Text>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700', width: 44, textAlign: 'right' }}>MULT.</Text>
      </View>

      {milestones.map((p, i) => {
        const mult     = p.capitalInvested > 0 ? p.totalValue / p.capitalInvested : 1
        const isFire   = fireAge !== null && p.age === fireAge
        const juros    = p.totalValue - p.capitalInvested
        const rowBg    = isFire ? '#042f2e' : i % 2 === 0 ? '#1e293b' : '#1a2540'

        return (
          <View key={p.age} style={{ backgroundColor: rowBg, borderTopWidth: 1, borderTopColor: '#334155' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 4 }}>
              <View style={{ width: 40, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: isFire ? '#2dd4bf' : '#e2e8f0', fontSize: 13, fontWeight: isFire ? '800' : '600' }}>
                  {p.age}
                </Text>
                {isFire && <Text style={{ fontSize: 10 }}>🎯</Text>}
              </View>
              <Text style={{ flex: 1, color: '#64748b', fontSize: 12, textAlign: 'right' }} numberOfLines={1}>
                {fmt(p.capitalInvested)}
              </Text>
              <Text style={{ flex: 1, color: '#2dd4bf', fontSize: 12, fontWeight: '700', textAlign: 'right' }} numberOfLines={1}>
                {fmt(p.totalValue)}
              </Text>
              <Text style={{ width: 44, color: mult >= 2 ? '#34d399' : '#94a3b8', fontSize: 12, fontWeight: '700', textAlign: 'right' }}>
                ×{mult.toFixed(1)}
              </Text>
            </View>
            {/* Barra de juros */}
            {juros > 0 && (
              <View style={{ height: 2, marginHorizontal: 16, marginBottom: 8, backgroundColor: '#0f172a', borderRadius: 2, flexDirection: 'row', overflow: 'hidden' }}>
                <View style={{ flex: p.capitalInvested / p.totalValue, backgroundColor: '#334155' }} />
                <View style={{ flex: juros / p.totalValue, backgroundColor: '#14b8a6' }} />
              </View>
            )}
          </View>
        )
      })}

      <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 3, backgroundColor: '#334155', borderRadius: 1 }} />
          <Text style={{ color: '#475569', fontSize: 10 }}>Capital investido</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 3, backgroundColor: '#14b8a6', borderRadius: 1 }} />
          <Text style={{ color: '#475569', fontSize: 10 }}>Juros compostos</Text>
        </View>
      </View>
    </View>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function MotorFIRE() {
  const { data, isLoading } = usePortfolio()

  const [aporte,      setAporte]      = useState(400)
  const [idadeAtual,  setIdadeAtual]  = useState(25)
  const [idadeAlvo,   setIdadeAlvo]   = useState(55)
  const [despesa,     setDespesa]     = useState(1200)

  const assets         = data?.assets ?? []
  const portfolioValue = data?.totalValue ?? 0
  const weightedRate   = useMemo(() => calcWeightedRate(assets), [assets])

  const result = useMemo(
    () => projectFIRE(portfolioValue, aporte, weightedRate, despesa, idadeAtual, idadeAlvo),
    [portfolioValue, aporte, weightedRate, despesa, idadeAtual, idadeAlvo],
  )

  return (
    <View style={{ gap: 14 }}>

      {/* ── Snapshot do portfólio ─────────────────────────────────────── */}
      {isLoading ? (
        <ActivityIndicator color="#14b8a6" style={{ paddingVertical: 20 }} />
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#042f2e', borderRadius: 16, borderWidth: 1, borderColor: '#14b8a630', padding: 14 }}>
            <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
              Portfólio atual
            </Text>
            <Text style={{ color: '#2dd4bf', fontSize: 18, fontWeight: '800' }} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(portfolioValue)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155', padding: 14 }}>
            <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
              Taxa ponderada
            </Text>
            <Text style={{ color: '#e2e8f0', fontSize: 18, fontWeight: '800' }}>
              {pct(weightedRate)}
              <Text style={{ color: '#475569', fontSize: 11, fontWeight: '400' }}> /ano</Text>
            </Text>
            {assets.length === 0 && (
              <Text style={{ color: '#475569', fontSize: 10, marginTop: 3 }}>padrão (portfólio vazio)</Text>
            )}
          </View>
        </View>
      )}

      {/* ── Steppers ──────────────────────────────────────────────────── */}
      <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', padding: 16, gap: 12 }}>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Parâmetros
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StepperInput label="Aporte mensal" value={aporte} step={50} min={0} max={10000} suffix="€" onChange={setAporte} />
          <StepperInput label="Despesa reforma" value={despesa} step={100} min={200} max={10000} suffix="€" onChange={setDespesa} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StepperInput
            label="Idade atual" value={idadeAtual} step={1} min={18} max={70} suffix=" anos"
            onChange={(v) => { setIdadeAtual(v); if (v >= idadeAlvo) setIdadeAlvo(v + 5) }}
          />
          <StepperInput
            label="Idade alvo" value={idadeAlvo} step={1} min={idadeAtual + 1} max={90} suffix=" anos"
            onChange={setIdadeAlvo}
          />
        </View>
        <View style={{ backgroundColor: '#0f172a', borderRadius: 10, padding: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: '#475569', fontSize: 11 }}>Número FIRE</Text>
          <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '700' }}>{fmt(result.fireNumber)}</Text>
        </View>
      </View>

      {/* ── VerdictCard ───────────────────────────────────────────────── */}
      <VerdictCard result={result} targetAge={idadeAlvo} despesa={despesa} />

      {/* ── MilestonesTable ───────────────────────────────────────────── */}
      <View>
        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
          Marcos da projeção (50 anos)
        </Text>
        <MilestonesTable points={result.points} currentAge={idadeAtual} fireAge={result.fireAge} />
      </View>

      <Text style={{ color: '#334155', fontSize: 10, lineHeight: 15, textAlign: 'center' }}>
        * Projeção educativa com taxa de retorno estimada. Não constitui aconselhamento financeiro.
      </Text>

    </View>
  )
}
