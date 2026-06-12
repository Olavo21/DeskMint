import { useState, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Rect } from 'react-native-svg'

type TipoTaxa = 'fixa' | 'variavel'

function calcPMT(capital: number, taxaAnual: number, meses: number) {
  const r = taxaAnual / 100 / 12
  if (r === 0 || meses === 0) return capital / (meses || 1)
  return capital * r / (1 - Math.pow(1 + r, -meses))
}

const fmt = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

const EURIBOR_CENARIOS = [
  { label: 'Actual',  delta: 0,   highlight: false },
  { label: '+0,5%',   delta: 0.5, highlight: false },
  { label: '+1,0%',   delta: 1.0, highlight: true  },
  { label: '+2,0%',   delta: 2.0, highlight: false },
]

function MiniBarChart({ capital, jurosTotal }: { capital: number; jurosTotal: number }) {
  const total = capital + jurosTotal
  const W = 300
  const H = 48
  const capW = (capital / total) * W
  const jurW = (jurosTotal / total) * W

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Rect x="0" y="12" width={capW} height="24" rx="4" fill="#14b8a6" opacity="0.8" />
        <Rect x={capW + 2} y="12" width={Math.max(jurW - 2, 0)} height="24" rx="4" fill="#ef4444" opacity="0.6" />
      </Svg>
      <View className="flex-row justify-between">
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-teal-500/80" />
          <Text className="text-dark-400 text-xs">Capital {fmt(capital)}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="w-2.5 h-2.5 rounded-sm bg-red-500/60" />
          <Text className="text-dark-400 text-xs">Juros {fmt(jurosTotal)}</Text>
        </View>
      </View>
    </View>
  )
}

export default function CalculadoraCreditos() {
  const [tipoTaxa, setTipoTaxa]   = useState<TipoTaxa>('variavel')
  const [capital, setCapital]     = useState('150000')
  const [prazo, setPrazo]         = useState('360')
  const [taxa, setTaxa]           = useState('3.5')
  const [euribor, setEuribor]     = useState('3.5')
  const [spread, setSpread]       = useState('1.0')

  const params = useMemo(() => {
    const c = parseFloat(capital.replace(',', '.')) || 0
    const p = parseInt(prazo) || 360
    const t = tipoTaxa === 'fixa'
      ? parseFloat(taxa.replace(',', '.')) || 0
      : (parseFloat(euribor.replace(',', '.')) || 0) + (parseFloat(spread.replace(',', '.')) || 0)
    const pmt = calcPMT(c, t, p)
    const totalPago = pmt * p
    const jurosTotal = totalPago - c
    return { c, p, t, pmt, totalPago, jurosTotal }
  }, [capital, prazo, taxa, euribor, spread, tipoTaxa])

  const { c, p, t, pmt, totalPago, jurosTotal } = params

  const cenariosEuribor = useMemo(() => {
    const baseEuribor = parseFloat(euribor.replace(',', '.')) || 0
    const baseSpread  = parseFloat(spread.replace(',', '.')) || 0
    return EURIBOR_CENARIOS.map((sc) => {
      const novaEuribor = baseEuribor + sc.delta
      const novaTaxa    = novaEuribor + baseSpread
      const novaPmt     = calcPMT(c, novaTaxa, p)
      return {
        ...sc,
        euribor: novaEuribor.toFixed(2) + '%',
        taxa:    novaTaxa.toFixed(2) + '%',
        pmt:     novaPmt,
        delta:   novaPmt - pmt,
      }
    })
  }, [euribor, spread, c, p, pmt])

  return (
    <View className="gap-4">
      {/* Tipo de taxa */}
      <View className="flex-row gap-2">
        {(['fixa', 'variavel'] as TipoTaxa[]).map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => setTipoTaxa(opt)}
            className={`flex-1 py-2.5 rounded-xl border items-center ${
              tipoTaxa === opt
                ? 'border-teal-500/50 bg-teal-500/10'
                : 'border-dark-600 bg-dark-800'
            }`}
          >
            <Text className={`text-sm font-semibold ${tipoTaxa === opt ? 'text-teal-600' : 'text-dark-400'}`}>
              {opt === 'fixa' ? 'Taxa Fixa' : 'Taxa Variável (Euribor)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Inputs */}
      <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4 gap-3">
        <InputRow label="Capital em dívida (€)" value={capital} onChange={setCapital} />
        <InputRow label="Prazo restante (meses)" value={prazo} onChange={setPrazo} />
        {tipoTaxa === 'fixa' ? (
          <InputRow label="Taxa de juro anual (%)" value={taxa} onChange={setTaxa} />
        ) : (
          <>
            <InputRow label="Euribor 12 meses (%)" value={euribor} onChange={setEuribor} />
            <InputRow label="Spread (%)" value={spread} onChange={setSpread} />
            <View className="bg-dark-700 rounded-xl px-3 py-2 flex-row justify-between">
              <Text className="text-dark-400 text-sm">Taxa total</Text>
              <Text className="text-dark-100 text-sm font-bold">{t.toFixed(2)}%</Text>
            </View>
          </>
        )}
      </View>

      {/* Resultado — destaque */}
      <View className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4">
        <Text className="text-teal-600 text-xs mb-1">Prestação mensal</Text>
        <Text className="text-teal-600 text-3xl font-black">{fmt(pmt)}</Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs mb-1">Total pago</Text>
          <Text className="text-dark-100 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(totalPago)}
          </Text>
        </View>
        <View className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs mb-1">Total em juros</Text>
          <Text className="text-red-500 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(jurosTotal)}
          </Text>
        </View>
      </View>

      {/* Distribuição */}
      <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4">
        <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">Distribuição capital vs. juros</Text>
        <MiniBarChart capital={c} jurosTotal={jurosTotal} />
      </View>

      {/* Stress test Euribor */}
      {tipoTaxa === 'variavel' && (
        <View className="bg-dark-800 border border-dark-600 rounded-2xl p-4">
          <Text className="text-dark-400 text-xs uppercase tracking-widest mb-3">
            Stress test Euribor
          </Text>
          <View className="gap-2">
            <View className="flex-row">
              <Text className="text-dark-500 text-xs flex-1">Cenário</Text>
              <Text className="text-dark-500 text-xs w-20 text-center">Taxa</Text>
              <Text className="text-dark-500 text-xs w-24 text-right">Prestação</Text>
              <Text className="text-dark-500 text-xs w-20 text-right">Δ</Text>
            </View>
            {cenariosEuribor.map((sc) => (
              <View
                key={sc.label}
                className={`flex-row items-center py-2 rounded-lg px-2 ${sc.highlight ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}
              >
                <Text className="text-dark-200 text-sm flex-1">{sc.label}</Text>
                <Text className="text-dark-400 text-xs w-20 text-center">{sc.taxa}</Text>
                <Text className="text-dark-100 text-sm font-semibold w-24 text-right">
                  {fmt(sc.pmt)}
                </Text>
                <Text
                  className="text-xs w-20 text-right font-semibold"
                  style={{ color: sc.delta > 0 ? '#ef4444' : '#14b8a6' }}
                >
                  {sc.delta !== 0 ? (sc.delta > 0 ? '+' : '') + fmt(sc.delta) : '—'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text className="text-dark-500 text-xs text-center">
        * Valores indicativos. Consulta sempre a tua instituição financeira.
      </Text>
    </View>
  )
}

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text className="text-dark-400 text-xs mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={{ color: '#334155' }}
        className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-sm"
      />
    </View>
  )
}
