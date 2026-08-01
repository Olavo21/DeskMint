import { useState, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg'
import { ATIVOS, gerarHistorico, calcMetricas, type Ativo } from '../../lib/ativos'
import { useFmt2 } from '../../utils/format'

type Filtro = 'Todos' | 'ETF' | 'Ação'

function MiniChart({ historico, cor }: { historico: { data: string; preco: number }[]; cor: string }) {
  const W = 300
  const H = 80
  if (historico.length < 2) return null

  const prices = historico.map((h) => h.preco)
  const min = Math.min(...prices)
  const max = Math.max(...prices)

  const toX = (i: number) => (i / (historico.length - 1)) * W
  const toY = (v: number) => H - ((v - min) / (max - min || 1)) * H * 0.9 - H * 0.05

  const line = historico.map((h, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(h.preco)}`).join(' ')
  const fill = `${line} L ${W} ${H} L 0 ${H} Z`

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id={`g${cor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={cor} stopOpacity="0.3" />
          <Stop offset="1" stopColor={cor} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path d={fill} fill={`url(#g${cor.replace('#','')})`} />
      <Path d={line} fill="none" stroke={cor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function AtivoCard({ ativo, onSelect, selected }: { ativo: Ativo; onSelect: () => void; selected: boolean }) {
  const fmt = useFmt2()
  const historico = useMemo(() => gerarHistorico(ativo), [ativo])
  const metricas  = useMemo(() => calcMetricas(historico), [historico])
  const positivo  = parseFloat(metricas.p1a) >= 0
  const cor       = positivo ? '#14b8a6' : '#ef4444'

  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`bg-slate-800 border rounded-2xl p-4 mb-2 ${selected ? 'border-teal-500/60' : 'border-slate-700'}`}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2">
            <Text className="text-slate-200 font-bold text-sm">{ativo.ticker}</Text>
            <View className="px-1.5 py-0.5 rounded bg-slate-700">
              <Text className="text-slate-400 text-xs">{ativo.tipo}</Text>
            </View>
            {ativo.acumulativo && (
              <View className="px-1.5 py-0.5 rounded bg-teal-500/15">
                <Text className="text-teal-400 text-xs">Acc</Text>
              </View>
            )}
          </View>
          <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{ativo.nome}</Text>
        </View>
        <View className="items-end ml-2">
          <Text className="text-slate-200 font-semibold text-sm">{fmt(ativo.precoBase)}</Text>
          <Text className="text-xs" style={{ color: cor }}>
            {positivo ? '+' : ''}{metricas.p1a}% (1a)
          </Text>
        </View>
      </View>
      <MiniChart historico={historico.slice(-24)} cor={cor} />
      <View className="flex-row justify-between mt-2">
        <View>
          <Text className="text-slate-500 text-xs">Retorno anual</Text>
          <Text className="text-slate-300 text-xs font-semibold">{(ativo.retornoAnual * 100).toFixed(0)}%</Text>
        </View>
        <View>
          <Text className="text-slate-500 text-xs">Volatilidade</Text>
          <Text className="text-slate-300 text-xs font-semibold">{(ativo.volatilidade * 100).toFixed(0)}%</Text>
        </View>
        {ativo.dividendYield > 0 && (
          <View>
            <Text className="text-slate-500 text-xs">Yield div.</Text>
            <Text className="text-amber-400 text-xs font-semibold">{(ativo.dividendYield * 100).toFixed(1)}%</Text>
          </View>
        )}
        <View>
          <Text className="text-slate-500 text-xs">Categoria</Text>
          <Text className="text-slate-300 text-xs font-semibold">{ativo.categoria}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

function DetalheAtivo({ ativo, onBack }: { ativo: Ativo; onBack: () => void }) {
  const fmt = useFmt2()
  const historico = useMemo(() => gerarHistorico(ativo), [ativo])
  const metricas  = useMemo(() => calcMetricas(historico), [historico])
  const positivo  = parseFloat(metricas.p1a) >= 0
  const cor       = positivo ? '#14b8a6' : '#ef4444'

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} className="flex-row items-center gap-2 mb-4">
        <Ionicons name="arrow-back" size={16} color="#64748b" />
        <Text className="text-slate-400 text-sm">Voltar</Text>
      </TouchableOpacity>

      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3">
        <View className="flex-row justify-between items-start mb-1">
          <View>
            <Text className="text-white text-xl font-black">{ativo.ticker}</Text>
            <Text className="text-slate-400 text-sm">{ativo.nome}</Text>
          </View>
          <View className="items-end">
            <Text className="text-white text-xl font-bold">{fmt(ativo.precoBase)}</Text>
            <Text style={{ color: cor }} className="text-sm font-semibold">
              {positivo ? '+' : ''}{metricas.p1a}% (1 ano)
            </Text>
          </View>
        </View>
        <Text className="text-slate-400 text-xs leading-5 mt-2">{ativo.descricao}</Text>
      </View>

      {/* Gráfico histórico */}
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3">
        <Text className="text-slate-400 text-xs uppercase tracking-widest mb-3">Histórico 10 anos (simulado)</Text>
        <MiniChart historico={historico} cor={cor} />
      </View>

      {/* Métricas */}
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3">
        <Text className="text-slate-400 text-xs uppercase tracking-widest mb-3">Métricas</Text>
        <View className="flex-row flex-wrap gap-3">
          {[
            { label: '1 mês',  value: metricas.p1m + '%' },
            { label: '6 meses', value: metricas.p6m + '%' },
            { label: '1 ano',  value: metricas.p1a + '%' },
            { label: '3 anos', value: metricas.p3a + '%' },
            { label: '5 anos', value: metricas.p5a + '%' },
            { label: 'Volatilidade', value: (ativo.volatilidade * 100).toFixed(0) + '%' },
          ].map(({ label, value }) => {
            const v = parseFloat(value)
            const isMetrica = label === 'Volatilidade'
            const isPos = v >= 0
            return (
              <View key={label} className="bg-slate-700 rounded-xl px-3 py-2.5" style={{ minWidth: '28%' }}>
                <Text className="text-slate-400 text-xs">{label}</Text>
                <Text
                  className="text-sm font-bold mt-0.5"
                  style={{ color: isMetrica ? '#94a3b8' : isPos ? '#14b8a6' : '#ef4444' }}
                >
                  {!isMetrica && isPos ? '+' : ''}{value}
                </Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* Info adicional */}
      <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-3">
        <View className="gap-2">
          {[
            { label: 'Tipo', value: ativo.tipo },
            { label: 'Categoria', value: ativo.categoria },
            { label: 'Acumulativo', value: ativo.acumulativo ? 'Sim (reinveste dividendos)' : 'Não (paga dividendos)' },
            ...(ativo.dividendYield > 0 ? [{ label: 'Dividend Yield', value: (ativo.dividendYield * 100).toFixed(1) + '% estimado' }] : []),
            { label: 'Retorno anual esperado', value: (ativo.retornoAnual * 100).toFixed(0) + '% (histórico simulado)' },
          ].map(({ label, value }) => (
            <View key={label} className="flex-row justify-between py-1.5 border-b border-slate-700/50">
              <Text className="text-slate-400 text-sm">{label}</Text>
              <Text className="text-slate-200 text-sm font-medium">{value}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text className="text-slate-600 text-xs text-center mb-4">
        * Histórico simulado com base em dados estatísticos. Não constitui aconselhamento financeiro.
      </Text>
    </ScrollView>
  )
}

export default function PesquisaAtivos() {
  const [query, setQuery]           = useState('')
  const [filtro, setFiltro]         = useState<Filtro>('Todos')
  const [selecionado, setSelecionado] = useState<Ativo | null>(null)

  const filtrados = useMemo(() =>
    ATIVOS.filter((a) => {
      const matchTipo = filtro === 'Todos' || a.tipo === filtro
      const q = query.toLowerCase()
      const matchQ = !q || a.ticker.toLowerCase().includes(q) || a.nome.toLowerCase().includes(q) || a.categoria.toLowerCase().includes(q)
      return matchTipo && matchQ
    }), [query, filtro])

  if (selecionado) {
    return <DetalheAtivo ativo={selecionado} onBack={() => setSelecionado(null)} />
  }

  return (
    <View className="gap-3">
      {/* Search */}
      <View className="flex-row items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3">
        <Ionicons name="search-outline" size={16} color="#64748b" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar ticker, nome ou categoria..."
          placeholderTextColor="#475569"
          className="flex-1 py-3 text-slate-200 text-sm"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View className="flex-row gap-2">
        {(['Todos', 'ETF', 'Ação'] as Filtro[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-lg border ${filtro === f ? 'bg-teal-500/15 border-teal-500/40' : 'bg-slate-800 border-slate-700'}`}
          >
            <Text className={`text-sm ${filtro === f ? 'text-teal-400 font-semibold' : 'text-slate-400'}`}>{f}</Text>
          </TouchableOpacity>
        ))}
        <Text className="text-slate-500 text-sm self-center ml-auto">{filtrados.length} ativos</Text>
      </View>

      {/* Lista */}
      {filtrados.map((a) => (
        <AtivoCard key={a.ticker} ativo={a} selected={false} onSelect={() => setSelecionado(a)} />
      ))}
    </View>
  )
}
