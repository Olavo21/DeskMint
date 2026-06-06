import { useState, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg'

const PRESETS = [
  { label: 'Conservador (AGGH)', taxa: '4' },
  { label: 'Moderado (VWCE)',    taxa: '8' },
  { label: 'Crescimento (IWDA)', taxa: '10' },
  { label: 'Agressivo (QQQ)',    taxa: '14' },
]

const fmt = (v: number) =>
  v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

function MiniAreaChart({ pontos }: { pontos: { ano: string; valor: number; investido: number }[] }) {
  const W = 320
  const H = 160
  const PAD = { t: 10, b: 28, l: 8, r: 8 }

  if (pontos.length < 2) return null

  const maxV = Math.max(...pontos.map((p) => p.valor))
  const minI = Math.min(...pontos.map((p) => p.investido))

  const toX = (i: number) => PAD.l + (i / (pontos.length - 1)) * (W - PAD.l - PAD.r)
  const toY = (v: number) => PAD.t + (1 - (v - minI) / (maxV - minI || 1)) * (H - PAD.t - PAD.b)

  const lineValor = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.valor)}`).join(' ')
  const lineInvest = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.investido)}`).join(' ')
  const fillValor = `${lineValor} L ${toX(pontos.length - 1)} ${H - PAD.b} L ${toX(0)} ${H - PAD.b} Z`
  const fillInvest = `${lineInvest} L ${toX(pontos.length - 1)} ${H - PAD.b} L ${toX(0)} ${H - PAD.b} Z`

  // X axis labels — show first, middle, last
  const labelIdxs = [0, Math.floor(pontos.length / 2), pontos.length - 1]

  return (
    <View>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#14b8a6" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#14b8a6" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="gi" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#6366f1" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#6366f1" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={fillInvest} fill="url(#gi)" />
        <Path d={fillValor} fill="url(#gv)" />
        <Path d={lineInvest} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={lineValor} fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD.l, marginTop: -4 }}>
        {labelIdxs.map((i) => (
          <Text key={i} style={{ color: '#475569', fontSize: 9 }}>{pontos[i].ano}</Text>
        ))}
      </View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 2, backgroundColor: '#14b8a6', borderRadius: 1 }} />
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>Valor total</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 10, height: 2, backgroundColor: '#6366f1', borderRadius: 1 }} />
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>Investido</Text>
        </View>
      </View>
    </View>
  )
}

export default function CalculadoraETF() {
  const [inicial, setInicial]   = useState('1000')
  const [mensal, setMensal]     = useState('100')
  const [taxa, setTaxa]         = useState('10')
  const [anos, setAnos]         = useState('20')

  const dados = useMemo(() => {
    const p = parseFloat(inicial.replace(',', '.')) || 0
    const c = parseFloat(mensal.replace(',', '.')) || 0
    const r = (parseFloat(taxa.replace(',', '.')) || 0) / 100 / 12
    const n = Math.min(parseInt(anos) || 20, 50)

    const pontos: { ano: string; valor: number; investido: number }[] = []
    let valor = p
    let totalInvestido = p

    for (let mes = 1; mes <= n * 12; mes++) {
      valor = valor * (1 + r) + c
      totalInvestido += c
      if (mes % 12 === 0) {
        pontos.push({
          ano: `Ano ${mes / 12}`,
          valor: Math.round(valor),
          investido: Math.round(totalInvestido),
        })
      }
    }
    return { pontos, valorFinal: Math.round(valor), totalInvestido: Math.round(totalInvestido) }
  }, [inicial, mensal, taxa, anos])

  const lucro = dados.valorFinal - dados.totalInvestido
  const mult = dados.totalInvestido > 0 ? (dados.valorFinal / dados.totalInvestido).toFixed(1) : '0'

  return (
    <View className="gap-4">
      {/* Parâmetros */}
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 gap-4">
        <View className="flex-row flex-wrap gap-3">
          {([
            { label: 'Investimento Inicial', value: inicial, set: setInicial, suffix: '€' },
            { label: 'Reforço Mensal',        value: mensal,   set: setMensal,   suffix: '€' },
            { label: 'Taxa Anual Esperada',   value: taxa,     set: setTaxa,     suffix: '%' },
            { label: 'Horizonte Temporal',    value: anos,     set: setAnos,     suffix: 'anos' },
          ] as const).map(({ label, value, set, suffix }) => (
            <View key={label} style={{ width: '47%' }}>
              <Text className="text-slate-400 text-xs mb-1">{label}</Text>
              <View className="flex-row items-center bg-slate-700 border border-slate-600 rounded-xl overflow-hidden">
                <TextInput
                  value={value}
                  onChangeText={set}
                  keyboardType="decimal-pad"
                  className="flex-1 px-3 py-2.5 text-slate-200 text-sm"
                />
                <Text className="text-slate-500 text-xs px-2">{suffix}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Presets */}
        <View>
          <Text className="text-slate-500 text-xs mb-2">Pré-sets de taxa:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => setTaxa(p.taxa)}
                  className={`px-3 py-1.5 rounded-lg border ${taxa === p.taxa ? 'border-teal-500 bg-teal-500/15' : 'border-slate-600 bg-slate-700'}`}
                >
                  <Text className={`text-xs ${taxa === p.taxa ? 'text-teal-400' : 'text-slate-400'}`}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Resultados */}
      <View className="flex-row gap-3">
        <View className="flex-1 bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4">
          <Text className="text-teal-400 text-xs mb-1">Valor Final</Text>
          <Text className="text-teal-300 text-xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(dados.valorFinal)}
          </Text>
        </View>
        <View className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4">
          <Text className="text-slate-400 text-xs mb-1">Total Investido</Text>
          <Text className="text-slate-200 text-xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(dados.totalInvestido)}
          </Text>
        </View>
      </View>
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <Text className="text-slate-400 text-xs mb-1">Juros gerados (×{mult})</Text>
        <Text className="text-indigo-400 text-xl font-bold">{fmt(lucro)}</Text>
      </View>

      {/* Gráfico */}
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
        <Text className="text-slate-400 text-xs mb-3 uppercase tracking-widest">Evolução do portfólio</Text>
        <MiniAreaChart pontos={dados.pontos} />
      </View>

      <Text className="text-slate-600 text-xs text-center px-4">
        * Não constitui aconselhamento financeiro. Rentabilidades passadas não garantem resultados futuros.
      </Text>
    </View>
  )
}
