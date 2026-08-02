import { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Header from '../../components/ui/Header'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useAuthStore } from '../../stores/authStore'
import { useFmt } from '../../utils/format'

// ── Types ────────────────────────────────────────────────────────────────────

type CardKey = 'total' | 'tops' | 'allocation' | 'projection' | 'tax' | 'goal'

type Asset = {
  id: string; name: string; ticker: string; asset_type: string
  broker: string; capital_invested: number; current_value: number
  pl: number; plPct: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARDS: { key: CardKey; icon: string; label: string }[] = [
  { key: 'total',      icon: 'wallet-outline',      label: 'Total'     },
  { key: 'tops',       icon: 'trending-up-outline',  label: 'Tops'      },
  { key: 'allocation', icon: 'pie-chart-outline',    label: 'Alocação'  },
  { key: 'projection', icon: 'rocket-outline',       label: 'Projeção'  },
  { key: 'tax',        icon: 'receipt-outline',      label: 'Imposto'   },
  { key: 'goal',       icon: 'calculator-outline',   label: 'Objetivo'  },
]

const ANNUAL_RATE: Record<string, number> = {
  CONSERVATIVE: 0.04,
  MODERATE:     0.07,
  AGGRESSIVE:   0.10,
  SPECULATIVE:  0.12,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fv(pv: number, pmt: number, rAnnual: number, years: number): number {
  const r = rAnnual / 12
  const n = years * 12
  if (r === 0) return pv + pmt * n
  return pv * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r
}

function pmt(pvVal: number, fvTarget: number, rAnnual: number, years: number): number {
  const r = rAnnual / 12
  const n = years * 12
  if (r === 0) return n > 0 ? (fvTarget - pvVal) / n : 0
  const factor = Math.pow(1 + r, n)
  return (fvTarget - pvVal * factor) * r / (factor - 1)
}

function pct(v: number) { return `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` }

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Row({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <View className="flex-row justify-between items-center py-2.5 border-b border-dark-700">
      <Text className="text-dark-400 text-sm">{label}</Text>
      <View className="items-end">
        <Text style={{ color: color ?? '#e2e8f0', fontWeight: '600', fontSize: 14 }}>{value}</Text>
        {sub ? <Text className="text-dark-500 text-xs mt-0.5">{sub}</Text> : null}
      </View>
    </View>
  )
}

function InsightBox({ text }: { text: string }) {
  return (
    <View style={{ marginTop: 16, flexDirection: 'row', gap: 8, backgroundColor: '#0f2a26', borderWidth: 1, borderColor: '#14b8a640', borderRadius: 12, padding: 12 }}>
      <Ionicons name="bulb-outline" size={14} color="#2dd4bf" style={{ marginTop: 1 }} />
      <Text style={{ color: '#e2e8f0', fontSize: 12, lineHeight: 20, flex: 1 }}>{text}</Text>
    </View>
  )
}

function EmptyPortfolio() {
  return (
    <View className="items-center py-12 gap-3">
      <Ionicons name="pie-chart-outline" size={40} color="#334155" />
      <Text className="text-dark-500 text-sm text-center">
        Sem ativos no portfólio.{'\n'}Adiciona ativos no separador Investimentos.
      </Text>
    </View>
  )
}

// ── Card: Total ───────────────────────────────────────────────────────────────

function CardTotal({ assets, totalValue, totalCapital, totalPL, totalPLPct }: {
  assets: Asset[]; totalValue: number; totalCapital: number
  totalPL: number; totalPLPct: number
}) {
  const fmt = useFmt()
  if (assets.length === 0) return <EmptyPortfolio />

  const plColor = totalPL >= 0 ? '#34d399' : '#f87171'

  return (
    <View className="gap-0">
      <Row label="Capital investido" value={fmt(totalCapital)} />
      <Row label="Valor atual"       value={fmt(totalValue)} />
      <Row
        label="Lucro / Prejuízo"
        value={`${totalPL >= 0 ? '+' : ''}${fmt(totalPL)}`}
        sub={pct(totalPLPct)}
        color={plColor}
      />
      <Row label="Nº de ativos" value={String(assets.length)} />
      <InsightBox
        text={
          totalPL >= 0
            ? `O teu portfólio está ${pct(totalPLPct)} acima do capital investido.`
            : `O teu portfólio está ${pct(totalPLPct)} abaixo do capital investido.`
        }
      />
    </View>
  )
}

// ── Card: Tops / Flops ────────────────────────────────────────────────────────

function CardTops({ assets }: { assets: Asset[] }) {
  const fmt = useFmt()
  if (assets.length === 0) return <EmptyPortfolio />

  const sorted = [...assets].sort((a, b) => b.plPct - a.plPct)
  const tops  = sorted.slice(0, 3)
  const flops = [...sorted].reverse().slice(0, 3).filter((a) => a.plPct < tops[tops.length - 1]?.plPct)

  function AssetRow({ a, rank }: { a: Asset; rank: number }) {
    const color = a.plPct >= 0 ? '#34d399' : '#f87171'
    return (
      <View className="flex-row items-center gap-3 py-2.5 border-b border-dark-700">
        <Text className="text-dark-500 text-xs w-4">{rank}</Text>
        <View className="flex-1">
          <Text className="text-dark-100 text-sm font-semibold">{a.ticker}</Text>
          <Text className="text-dark-500 text-xs" numberOfLines={1}>{a.name}</Text>
        </View>
        <View className="items-end">
          <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{pct(a.plPct)}</Text>
          <Text className="text-dark-500 text-xs">{fmt(a.pl >= 0 ? a.pl : -a.pl)}</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="gap-0">
      <Text className="text-dark-500 text-xs uppercase tracking-wider mb-1">Melhores</Text>
      {tops.map((a, i) => <AssetRow key={a.id} a={a} rank={i + 1} />)}

      {flops.length > 0 && (
        <>
          <Text className="text-dark-500 text-xs uppercase tracking-wider mt-4 mb-1">Piores</Text>
          {flops.map((a, i) => <AssetRow key={a.id} a={a} rank={i + 1} />)}
        </>
      )}
    </View>
  )
}

// ── Card: Allocation ──────────────────────────────────────────────────────────

function CardAllocation({ assets, totalValue }: { assets: Asset[]; totalValue: number }) {
  const fmt = useFmt()
  if (assets.length === 0) return <EmptyPortfolio />

  const byType = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assets) {
      map[a.asset_type] = (map[a.asset_type] ?? 0) + a.current_value
    }
    return Object.entries(map)
      .map(([tipo, valor]) => ({ tipo, valor, pct: totalValue > 0 ? valor / totalValue : 0 }))
      .sort((a, b) => b.valor - a.valor)
  }, [assets, totalValue])

  const byBroker = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assets) {
      map[a.broker] = (map[a.broker] ?? 0) + a.current_value
    }
    return Object.entries(map)
      .map(([broker, valor]) => ({ broker, valor, pct: totalValue > 0 ? valor / totalValue : 0 }))
      .sort((a, b) => b.valor - a.valor)
  }, [assets, totalValue])

  const biggest = assets.reduce((m, a) => a.current_value > m.current_value ? a : m, assets[0])
  const biggestPct = totalValue > 0 ? biggest.current_value / totalValue : 0

  return (
    <View className="gap-0">
      <Text className="text-dark-500 text-xs uppercase tracking-wider mb-1">Por Tipo</Text>
      {byType.map(({ tipo, valor, pct: p }) => (
        <View key={tipo} className="py-2 border-b border-dark-700">
          <View className="flex-row justify-between mb-1.5">
            <Text className="text-dark-200 text-sm">{tipo}</Text>
            <Text className="text-dark-200 text-sm font-semibold">{(p * 100).toFixed(1)}%</Text>
          </View>
          <View className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <View style={{ width: `${p * 100}%`, height: '100%', backgroundColor: '#14b8a6', borderRadius: 99 }} />
          </View>
          <Text className="text-dark-500 text-xs mt-1">{fmt(valor)}</Text>
        </View>
      ))}

      <Text className="text-dark-500 text-xs uppercase tracking-wider mt-4 mb-1">Por Corretora</Text>
      {byBroker.map(({ broker, pct: p }) => (
        <View key={broker} className="flex-row justify-between py-2 border-b border-dark-700">
          <Text className="text-dark-300 text-sm">{broker}</Text>
          <Text className="text-dark-200 text-sm font-semibold">{(p * 100).toFixed(1)}%</Text>
        </View>
      ))}

      <InsightBox
        text={
          biggestPct > 0.5
            ? `${biggest.ticker} representa ${(biggestPct * 100).toFixed(0)}% do portfólio — concentração elevada.`
            : `Maior posição: ${biggest.ticker} com ${(biggestPct * 100).toFixed(0)}% — diversificação razoável.`
        }
      />
    </View>
  )
}

// ── Card: Projection ─────────────────────────────────────────────────────────

function CardProjection({ totalValue, monthlyInvest, investorType }: {
  totalValue: number; monthlyInvest: number; investorType: string | null
}) {
  const fmt = useFmt()
  const rate   = ANNUAL_RATE[investorType ?? 'MODERATE'] ?? 0.07
  const pmtAmt = monthlyInvest > 0 ? monthlyInvest : 0

  const scenarios = [5, 10, 20].map((years) => ({
    years,
    fvVal: fv(totalValue, pmtAmt, rate, years),
  }))

  const rateLabel: Record<string, string> = {
    CONSERVATIVE: '4% a.a.',
    MODERATE:     '7% a.a.',
    AGGRESSIVE:   '10% a.a.',
    SPECULATIVE:  '12% a.a.',
  }

  return (
    <View className="gap-0">
      <View className="flex-row gap-2 mb-4">
        <View className="flex-1 bg-dark-700 rounded-xl p-3">
          <Text className="text-dark-500 text-xs mb-1">Portfólio atual</Text>
          <Text className="text-dark-100 text-base font-bold">{fmt(totalValue)}</Text>
        </View>
        <View className="flex-1 bg-dark-700 rounded-xl p-3">
          <Text className="text-dark-500 text-xs mb-1">Aporte mensal</Text>
          <Text className="text-dark-100 text-base font-bold">
            {pmtAmt > 0 ? fmt(pmtAmt) : '—'}
          </Text>
        </View>
      </View>

      <Row
        label="Taxa usada"
        value={rateLabel[investorType ?? 'MODERATE'] ?? '7% a.a.'}
        sub={investorType ?? 'MODERATE'}
      />

      {scenarios.map(({ years, fvVal }) => (
        <Row
          key={years}
          label={`Daqui a ${years} anos`}
          value={fmt(fvVal)}
          color="#2dd4bf"
        />
      ))}

      <InsightBox
        text={`Com ${fmt(pmtAmt)}/mês e taxa ${(rate * 100).toFixed(0)}%, em 20 anos o teu portfólio pode valer ${fmt(scenarios[2].fvVal)}.`}
      />
    </View>
  )
}

// ── Card: Tax ─────────────────────────────────────────────────────────────────

function CardTax({ assets, totalValue, totalCapital, totalPL }: {
  assets: Asset[]; totalValue: number; totalCapital: number; totalPL: number
}) {
  const fmt = useFmt()
  if (assets.length === 0) return <EmptyPortfolio />

  const taxableGain  = Math.max(0, totalPL)
  const taxEstimated = taxableGain * 0.28
  const netGain      = totalPL - taxEstimated

  const plColor = totalPL >= 0 ? '#34d399' : '#f87171'

  return (
    <View className="gap-0">
      <Row label="Capital investido"     value={fmt(totalCapital)} />
      <Row label="Valor de venda atual"  value={fmt(totalValue)} />
      <Row
        label="Mais-valias brutas"
        value={`${totalPL >= 0 ? '+' : ''}${fmt(totalPL)}`}
        color={plColor}
      />
      {totalPL > 0 ? (
        <>
          <Row label="Imposto estimado (28%)" value={`− ${fmt(taxEstimated)}`} color="#f87171" />
          <Row label="Ganho líquido"           value={fmt(netGain)} color="#2dd4bf" />
        </>
      ) : (
        <Row label="Imposto estimado" value="0,00 €" sub="Menos-valia — sem imposto" color="#34d399" />
      )}

      <View className="mt-4 flex-row gap-2 bg-slate-800/60 border border-slate-700/40 rounded-xl p-3">
        <Ionicons name="information-circle-outline" size={14} color="#475569" style={{ marginTop: 1 }} />
        <Text className="text-dark-500 text-xs leading-5 flex-1">
          Simulação com taxa autónoma de 28% (PT). Cripto detida {'>'} 365 dias pode estar isenta. Consulta sempre um fiscalista.
        </Text>
      </View>
    </View>
  )
}

// ── Card: Goal ────────────────────────────────────────────────────────────────

function CardGoal({ totalValue, investorType }: {
  totalValue: number; investorType: string | null
}) {
  const fmt  = useFmt()
  const rate = ANNUAL_RATE[investorType ?? 'MODERATE'] ?? 0.07

  const [goal,  setGoal]  = useState('')
  const [years, setYears] = useState('10')

  const result = useMemo(() => {
    const fvTarget = parseFloat(goal.replace('.', '').replace(',', '.'))
    const y        = parseInt(years) || 10
    if (!fvTarget || fvTarget <= 0 || y <= 0) return null
    if (fvTarget <= totalValue) return { pmtNeeded: 0, fvTarget, years: y }
    return { pmtNeeded: pmt(totalValue, fvTarget, rate, y), fvTarget, years: y }
  }, [goal, years, totalValue, rate])

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-dark-400 text-xs mb-1.5">Objetivo (€)</Text>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder="100.000"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-3 text-dark-100 text-sm"
            style={{ color: '#e2e8f0' }}
          />
        </View>
        <View style={{ width: 100 }}>
          <Text className="text-dark-400 text-xs mb-1.5">Prazo (anos)</Text>
          <TextInput
            value={years}
            onChangeText={setYears}
            placeholder="10"
            placeholderTextColor="#475569"
            keyboardType="numeric"
            className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-3 text-dark-100 text-sm"
            style={{ color: '#e2e8f0' }}
          />
        </View>
      </View>

      {result ? (
        <View className="gap-0">
          <Row label="Portfólio atual (PV)"  value={fmt(totalValue)} />
          <Row label="Objetivo (FV)"          value={fmt(result.fvTarget)} />
          <Row label="Taxa assumida"          value={`${(rate * 100).toFixed(0)}% a.a.`} sub={investorType ?? 'MODERATE'} />
          <Row label="Prazo"                  value={`${result.years} anos`} />
          {result.pmtNeeded > 0 ? (
            <>
              <View className="mt-4 bg-teal-900/40 border border-teal-700/40 rounded-2xl p-4 items-center">
                <Text className="text-teal-400 text-xs mb-1">Aporte mensal necessário</Text>
                <Text style={{ color: '#2dd4bf', fontSize: 28, fontWeight: '900' }}>
                  {fmt(result.pmtNeeded)}
                </Text>
                <Text className="text-dark-400 text-xs mt-1">/ mês</Text>
              </View>
              <InsightBox
                text={`Com ${fmt(result.pmtNeeded)}/mês durante ${result.years} anos a ${(rate * 100).toFixed(0)}% a.a., atinges ${fmt(result.fvTarget)}.`}
              />
            </>
          ) : (
            <View className="mt-4 bg-teal-900/40 border border-teal-700/40 rounded-2xl p-4 items-center">
              <Ionicons name="checkmark-circle" size={28} color="#34d399" />
              <Text className="text-teal-300 text-sm font-semibold mt-2">Objetivo já atingido!</Text>
              <Text className="text-dark-400 text-xs mt-1 text-center">
                O teu portfólio atual supera o objetivo definido.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="items-center py-8 gap-2">
          <Ionicons name="calculator-outline" size={36} color="#334155" />
          <Text className="text-dark-500 text-sm text-center">
            Introduz o objetivo e o prazo{'\n'}para calcular o aporte necessário.
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AssistenteScreen() {
  const { data, isLoading } = usePortfolio()
  const profile = useAuthStore((s) => s.profile)

  const [active, setActive] = useState<CardKey>('total')

  const assets       = (data?.assets ?? []) as Asset[]
  const totalValue   = data?.totalValue   ?? 0
  const totalCapital = data?.totalCapital ?? 0
  const totalPL      = data?.totalPL      ?? 0
  const totalPLPct   = data?.totalPLPct   ?? 0

  const investorType   = (profile?.investor_type as string | null) ?? null
  const monthlyInvest  = (profile?.monthly_invest as number | null) ?? 0

  function renderCard() {
    if (isLoading) {
      return (
        <View className="items-center py-16">
          <ActivityIndicator color="#14b8a6" size="large" />
        </View>
      )
    }

    switch (active) {
      case 'total':
        return <CardTotal assets={assets} totalValue={totalValue} totalCapital={totalCapital} totalPL={totalPL} totalPLPct={totalPLPct} />
      case 'tops':
        return <CardTops assets={assets} />
      case 'allocation':
        return <CardAllocation assets={assets} totalValue={totalValue} />
      case 'projection':
        return <CardProjection totalValue={totalValue} monthlyInvest={monthlyInvest} investorType={investorType} />
      case 'tax':
        return <CardTax assets={assets} totalValue={totalValue} totalCapital={totalCapital} totalPL={totalPL} />
      case 'goal':
        return <CardGoal totalValue={totalValue} investorType={investorType} />
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header title="Análise" />

      {/* Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 24, gap: 8, paddingVertical: 10, alignItems: 'center' }}
      >
        {CARDS.map((c) => {
          const isActive = active === c.key
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setActive(c.key)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 99,
                backgroundColor: isActive ? '#0d9488' : '#1e293b',
                borderWidth: 1,
                borderColor: isActive ? '#14b8a6' : '#334155',
              }}
            >
              <Ionicons
                name={c.icon as 'wallet-outline'}
                size={14}
                color={isActive ? '#fff' : '#64748b'}
              />
              <Text style={{
                fontSize: 13, fontWeight: isActive ? '700' : '400',
                color: isActive ? '#fff' : '#64748b',
              }}>
                {c.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Card content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-dark-800 border border-dark-700 rounded-2xl p-4">
          {renderCard()}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
