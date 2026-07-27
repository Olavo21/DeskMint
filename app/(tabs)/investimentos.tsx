import Header from '../../components/ui/Header'
import { useState, useMemo } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity,
  ActivityIndicator, useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import DonutChart, { type DonutSegment } from '../../components/investments/DonutChart'
import MarketNews from '../../components/investments/MarketNews'
import NovoAtivoModal from '../../components/investments/NovoAtivoModal'
import BrokerModal from '../../components/investments/BrokerModal'
import ManageAssetsModal from '../../components/investments/ManageAssetsModal'
import { getColor } from '../../lib/portfolioColors'
import { getSector, SECTOR_COLORS } from '../../lib/assetSectors'

type Tab = 'ativos' | 'tipo' | 'setor'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'ativos', label: 'Ativos', icon: 'list-outline'   },
  { key: 'tipo',   label: 'Tipo',   icon: 'shapes-outline' },
  { key: 'setor',  label: 'Setor',  icon: 'grid-outline'   },
]

const TYPE_LABELS: Record<string, string> = {
  ETF: 'ETF', STOCK: 'Ação', CRYPTO: 'Crypto', BOND: 'Obrigação', OTHER: 'Outro',
}
const TYPE_COLORS: Record<string, string> = {
  ETF: '#14b8a6', STOCK: '#6366f1', CRYPTO: '#f97316', BOND: '#10b981', OTHER: '#64748b',
}

export default function InvestimentosScreen() {
  const { width: screenW } = useWindowDimensions()
  const { data, isLoading } = usePortfolio()
  const [activeTab, setActiveTab] = useState<Tab>('ativos')
  const [showModal, setShowModal]   = useState(false)
  const [showBroker, setShowBroker] = useState(false)
  const [showManage, setShowManage] = useState(false)

  const donutSize      = Math.min(Math.round(screenW * 0.72), 300)
  const donutThickness = Math.round(donutSize * 0.13)

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

  const byAsset = useMemo<DonutSegment[]>(
    () => (data?.assets ?? []).map((a, i) => ({ value: a.current_value, color: getColor(i), label: a.ticker, pl: a.pl })),
    [data?.assets],
  )

  const byType = useMemo<DonutSegment[]>(() => {
    const map: Record<string, { value: number; pl: number }> = {}
    ;(data?.assets ?? []).forEach((a) => {
      const cur = map[a.asset_type] ?? { value: 0, pl: 0 }
      map[a.asset_type] = { value: cur.value + a.current_value, pl: cur.pl + a.pl }
    })
    return Object.entries(map).map(([t, v]) => ({
      value: v.value,
      color: TYPE_COLORS[t] ?? '#64748b',
      label: TYPE_LABELS[t] ?? t,
      pl: v.pl,
    }))
  }, [data?.assets])

  const bySector = useMemo<DonutSegment[]>(() => {
    const map: Record<string, { value: number; pl: number }> = {}
    ;(data?.assets ?? []).forEach((a) => {
      const s = getSector(a.ticker, a.asset_type)
      const cur = map[s] ?? { value: 0, pl: 0 }
      map[s] = { value: cur.value + a.current_value, pl: cur.pl + a.pl }
    })
    return Object.entries(map).map(([s, v]) => ({
      value: v.value,
      color: SECTOR_COLORS[s as keyof typeof SECTOR_COLORS] ?? '#64748b',
      label: s,
      pl: v.pl,
    }))
  }, [data?.assets])

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator color="#14b8a6" />
      </SafeAreaView>
    )
  }

  const totalValue = data?.totalValue ?? 0
  const totalPL    = data?.totalPL    ?? 0
  const totalPLPct = data?.totalPLPct ?? 0
  const plPos      = totalPL >= 0

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header title="Portfolio" />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Summary */}
        <View className="mx-4 mt-3 mb-4 bg-dark-800 border border-dark-600 rounded-2xl px-5 py-4">
          <Text className="text-dark-400 text-xs mb-1">Valor Total</Text>
          <Text className="text-dark-50 text-3xl font-bold">{fmt(totalValue)}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View
              className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
              style={{ backgroundColor: plPos ? '#14b8a615' : '#ef444415' }}
            >
              <Ionicons
                name={plPos ? 'trending-up-outline' : 'trending-down-outline'}
                size={12}
                color={plPos ? '#14b8a6' : '#ef4444'}
              />
              <Text className="text-xs font-semibold" style={{ color: plPos ? '#14b8a6' : '#ef4444' }}>
                {plPos ? '+' : ''}{fmt(totalPL)} ({plPos ? '+' : ''}{(totalPLPct * 100).toFixed(2)}%)
              </Text>
            </View>
            <Text className="text-dark-500 text-xs">P/L total</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View className="px-4 mb-5 flex-row gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-xl border ${
                  active ? 'bg-teal-500/15 border-teal-500/40' : 'bg-dark-800 border-dark-600'
                }`}
              >
                <Ionicons name={tab.icon as 'list-outline'} size={14} color={active ? '#14b8a6' : '#64748b'} />
                <Text className={`text-sm font-medium ${active ? 'text-teal-400' : 'text-dark-400'}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* ── Ativos ── */}
        {activeTab === 'ativos' && (
          <View>
            {byAsset.length > 0 ? (
              <>
                <View className="items-center pt-2 pb-1">
                  <DonutChart
                    segments={byAsset}
                    centerLabel={fmt(totalValue)}
                    centerSub="Portfolio"
                    size={donutSize}
                    thickness={donutThickness}
                    showSegmentLabels
                  />
                </View>
                <Legend segments={byAsset} assets={data?.assets ?? []} fmt={fmt} />

                <View className="mx-4 mt-4">
                  <TouchableOpacity
                    onPress={() => setShowManage(true)}
                    className="flex-row items-center justify-center gap-2 border border-teal-500/40 rounded-2xl py-3"
                    style={{ backgroundColor: '#14b8a610' }}
                  >
                    <Ionicons name="create-outline" size={16} color="#14b8a6" />
                    <Text className="text-teal-500 text-sm font-semibold">Editar Ativos</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View className="mx-4 py-10 items-center">
                <Ionicons name="pie-chart-outline" size={48} color="#94a3b8" />
                <Text className="text-dark-400 text-sm mt-3">Sem ativos no portfolio</Text>
              </View>
            )}

            <View className="mx-4 mt-6 mb-2">
              <MarketNews />
            </View>
          </View>
        )}

        {/* ── Tipo ── */}
        {activeTab === 'tipo' && (
          <View>
            <DonutChart segments={byType} centerLabel={fmt(totalValue)} centerSub="Por Tipo" />
            <View className="mx-4 mt-5 gap-2">
              {byType.map((seg) => (
                <GroupRow key={seg.label} seg={seg} total={totalValue} fmt={fmt} />
              ))}
            </View>
            <View className="h-24" />
          </View>
        )}

        {/* ── Setor ── */}
        {activeTab === 'setor' && (
          <View>
            <DonutChart segments={bySector} centerLabel={fmt(totalValue)} centerSub="Por Setor" />
            <View className="mx-4 mt-5 gap-2">
              {bySector.slice().sort((a, b) => b.value - a.value).map((seg) => (
                <GroupRow key={seg.label} seg={seg} total={totalValue} fmt={fmt} />
              ))}
            </View>
            <View className="mx-4 mt-3 bg-dark-800/50 border border-dark-600/50 rounded-xl p-3">
              <Text className="text-dark-500 text-xs">
                O setor é derivado automaticamente do ticker. ETFs de mercado amplo (VWCE, IWDA, etc.) aparecem em "Diversificado".
              </Text>
            </View>
            <View className="h-24" />
          </View>
        )}

      </ScrollView>

      {/* FABs */}
      <View className="absolute bottom-20 right-4 gap-2.5 items-end">
        <TouchableOpacity
          onPress={() => setShowBroker(true)}
          className="flex-row items-center gap-2 bg-dark-800 border border-dark-600 rounded-full px-4 py-2.5"
          style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 }}
        >
          <Ionicons name="link-outline" size={16} color="#0d9488" />
          <Text className="text-teal-600 text-sm font-semibold">Corretoras</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="flex-row items-center gap-2 bg-teal-500 rounded-full px-5 py-3"
          style={{ shadowColor: '#14b8a6', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-dark-50 text-sm font-semibold">Novo Ativo</Text>
        </TouchableOpacity>
      </View>

      <NovoAtivoModal visible={showModal} onClose={() => setShowModal(false)} />
      <BrokerModal visible={showBroker} onClose={() => setShowBroker(false)} />
      <ManageAssetsModal
        visible={showManage}
        onClose={() => setShowManage(false)}
        onAdd={() => { setShowManage(false); setTimeout(() => setShowModal(true), 300) }}
      />
    </SafeAreaView>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Legend({ segments, assets, fmt }: {
  segments: DonutSegment[]
  assets?: { ticker: string; pl: number; plPct: number }[]
  fmt: (n: number) => string
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  return (
    <View className="mx-4 mt-4 gap-1.5">
      {segments.map((seg, i) => {
        const asset = assets?.find((a) => a.ticker === seg.label)
        return (
          <View key={i} className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
              <View className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <Text className="text-dark-300 text-sm flex-1" numberOfLines={1}>{seg.label}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {asset && (
                <Text className="text-xs" style={{ color: asset.pl >= 0 ? '#14b8a6' : '#ef4444' }}>
                  {asset.pl >= 0 ? '+' : ''}{(asset.plPct * 100).toFixed(1)}%
                </Text>
              )}
              <Text className="text-dark-300 text-sm font-semibold w-24 text-right">{fmt(seg.value)}</Text>
              <Text className="text-dark-500 text-xs w-10 text-right">
                {total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

function GroupRow({ seg, total, fmt }: { seg: DonutSegment; total: number; fmt: (n: number) => string }) {
  return (
    <View className="flex-row items-center justify-between bg-dark-800 border border-dark-600 rounded-xl px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
        <Text className="text-dark-200 font-medium">{seg.label}</Text>
      </View>
      <View className="items-end">
        <Text className="text-dark-200 font-semibold">{fmt(seg.value)}</Text>
        <Text className="text-dark-500 text-xs">{total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%</Text>
      </View>
    </View>
  )
}
