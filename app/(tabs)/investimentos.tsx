import Header from '../../components/ui/Header'
import { useState, useMemo } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import { usePortfolioHistory } from '../../hooks/usePortfolioHistory'
import DonutChart, { type DonutSegment } from '../../components/investments/DonutChart'
import PortfolioLineChart, { type Range } from '../../components/investments/PortfolioLineChart'
import MarketNews from '../../components/investments/MarketNews'
import NovoAtivoModal from '../../components/investments/NovoAtivoModal'
import { getColor } from '../../lib/portfolioColors'
import { getRegion, getRegionLabel, REGION_COLORS } from '../../lib/assetRegions'

type Tab = 'ativos' | 'tipo' | 'regiao' | 'historico'
type EditState = { id: string; currentValue: string; capitalInvested: string; units: string; avgPrice: string }

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'ativos',    label: 'Ativos',     icon: 'list-outline'        },
  { key: 'tipo',      label: 'Tipo',       icon: 'shapes-outline'      },
  { key: 'regiao',    label: 'Região',     icon: 'earth-outline'       },
  { key: 'historico', label: 'Histórico',  icon: 'trending-up-outline' },
]

const TYPE_LABELS: Record<string, string> = {
  ETF: 'ETF', STOCK: 'Ação', CRYPTO: 'Crypto', BOND: 'Obrigação', OTHER: 'Outro',
}
const TYPE_COLORS: Record<string, string> = {
  ETF: '#14b8a6', STOCK: '#6366f1', CRYPTO: '#f97316', BOND: '#10b981', OTHER: '#64748b',
}

export default function InvestimentosScreen() {
  const { data, isLoading, updateAsset } = usePortfolio()
  const [activeTab, setActiveTab]         = useState<Tab>('ativos')
  const [showModal, setShowModal]         = useState(false)
  const [editing, setEditing]             = useState<EditState | null>(null)
  const [historyRange, setHistoryRange]   = useState<Range>('Todo')

  const { data: historyData, isLoading: historyLoading } = usePortfolioHistory(historyRange)

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

  const byAsset = useMemo<DonutSegment[]>(
    () => (data?.assets ?? []).map((a, i) => ({ value: a.current_value, color: getColor(i), label: a.ticker })),
    [data?.assets],
  )

  const byType = useMemo<DonutSegment[]>(() => {
    const map: Record<string, number> = {}
    ;(data?.assets ?? []).forEach((a) => { map[a.asset_type] = (map[a.asset_type] ?? 0) + a.current_value })
    return Object.entries(map).map(([t, v]) => ({ value: v, color: TYPE_COLORS[t] ?? '#64748b', label: TYPE_LABELS[t] ?? t }))
  }, [data?.assets])

  const byRegion = useMemo<DonutSegment[]>(() => {
    const map: Record<string, number> = {}
    ;(data?.assets ?? []).forEach((a) => {
      const r = getRegion(a.ticker, a.asset_type)
      map[r] = (map[r] ?? 0) + a.current_value
    })
    return Object.entries(map).map(([r, v]) => ({
      value: v,
      color: REGION_COLORS[r as keyof typeof REGION_COLORS] ?? '#64748b',
      label: getRegionLabel(r as Parameters<typeof getRegionLabel>[0]),
    }))
  }, [data?.assets])

  function startEdit(a: { id: string; current_value: number; capital_invested: number; units: number; avg_price: number }) {
    setEditing({ id: a.id, currentValue: String(a.current_value), capitalInvested: String(a.capital_invested), units: String(a.units), avgPrice: String(a.avg_price) })
  }

  async function saveEdit() {
    if (!editing) return
    const p = (s: string) => parseFloat(s.replace(',', '.'))
    const cv = p(editing.currentValue), ci = p(editing.capitalInvested)
    const u = p(editing.units), ap = p(editing.avgPrice)
    if (isNaN(cv)) return
    await updateAsset.mutateAsync({ id: editing.id, currentValue: cv, capitalInvested: isNaN(ci) ? cv : ci, units: isNaN(u) ? undefined : u, avgPrice: isNaN(ap) ? undefined : ap })
    setEditing(null)
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator color="#14b8a6" />
      </SafeAreaView>
    )
  }

  const totalValue   = data?.totalValue   ?? 0
  const totalPL      = data?.totalPL      ?? 0
  const totalPLPct   = data?.totalPLPct   ?? 0
  const plPos        = totalPL >= 0

  return (
    <SafeAreaView className="flex-1 bg-slate-900">
      <Header title="Portfolio" />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Summary */}
        <View className="mx-4 mt-3 mb-4 bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4">
          <Text className="text-slate-400 text-xs mb-1">Valor Total</Text>
          <Text className="text-white text-3xl font-bold">{fmt(totalValue)}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: plPos ? '#14b8a615' : '#ef444415' }}>
              <Ionicons name={plPos ? 'trending-up-outline' : 'trending-down-outline'} size={12} color={plPos ? '#14b8a6' : '#ef4444'} />
              <Text className="text-xs font-semibold" style={{ color: plPos ? '#14b8a6' : '#ef4444' }}>
                {plPos ? '+' : ''}{fmt(totalPL)} ({plPos ? '+' : ''}{(totalPLPct * 100).toFixed(2)}%)
              </Text>
            </View>
            <Text className="text-slate-500 text-xs">P/L total</Text>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 mb-5">
          <View className="flex-row gap-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.key
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-row items-center gap-1.5 px-4 py-2 rounded-xl border ${active ? 'bg-teal-500/15 border-teal-500/40' : 'bg-slate-800 border-slate-700'}`}
                >
                  <Ionicons name={tab.icon as 'list-outline'} size={14} color={active ? '#14b8a6' : '#64748b'} />
                  <Text className={`text-sm font-medium ${active ? 'text-teal-400' : 'text-slate-400'}`}>{tab.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {/* ── Ativos ── */}
        {activeTab === 'ativos' && (
          <View>
            {byAsset.length > 0 && (
              <>
                <DonutChart segments={byAsset} centerLabel={fmt(totalValue)} centerSub="Portfolio" />
                <Legend segments={byAsset} assets={data?.assets} fmt={fmt} />
              </>
            )}
            <View className="mx-4 mt-5 gap-2">
              {(data?.assets ?? []).map((asset, i) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  color={getColor(i)}
                  fmt={fmt}
                  editing={editing?.id === asset.id ? editing : null}
                  onEdit={() => startEdit(asset)}
                  onSave={saveEdit}
                  onCancel={() => setEditing(null)}
                  onEditChange={(field, val) => setEditing((prev) => prev ? { ...prev, [field]: val } : prev)}
                  isSaving={updateAsset.isPending}
                />
              ))}
            </View>
            <View className="mt-6"><MarketNews /></View>
          </View>
        )}

        {/* ── Tipo ── */}
        {activeTab === 'tipo' && (
          <View>
            <DonutChart segments={byType} centerLabel={fmt(totalValue)} centerSub="Por Tipo" />
            <Legend segments={byType} fmt={fmt} />
            <View className="mx-4 mt-5 gap-2">
              {byType.map((seg) => (
                <GroupRow key={seg.label} seg={seg} total={totalValue} fmt={fmt} />
              ))}
            </View>
          </View>
        )}

        {/* ── Região ── */}
        {activeTab === 'regiao' && (
          <View>
            <DonutChart segments={byRegion} centerLabel={fmt(totalValue)} centerSub="Por Região" />
            <Legend segments={byRegion} fmt={fmt} />
            <View className="mx-4 mt-5 gap-2">
              {byRegion.slice().sort((a, b) => b.value - a.value).map((seg) => (
                <GroupRow key={seg.label} seg={seg} total={totalValue} fmt={fmt} />
              ))}
            </View>
            <View className="mx-4 mt-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
              <Text className="text-slate-500 text-xs">
                A região é derivada automaticamente do ticker. ETFs não mapeados aparecem como "Outro".
              </Text>
            </View>
          </View>
        )}

        {/* ── Histórico ── */}
        {activeTab === 'historico' && (
          <View className="mx-4">
            <PortfolioLineChart
              data={historyData ?? []}
              range={historyRange}
              onRangeChange={setHistoryRange}
              isLoading={historyLoading}
            />
            {!historyLoading && (historyData?.length ?? 0) === 0 && (
              <View className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
                <Text className="text-slate-400 text-sm text-center">
                  Ainda não há snapshots. Os snapshots são gravados automaticamente quando actualizas um ativo.
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* FAB */}
      <View className="absolute bottom-6 right-4">
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="flex-row items-center gap-2 bg-teal-500 rounded-full px-5 py-3"
          style={{ shadowColor: '#14b8a6', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white text-sm font-semibold">Novo Ativo</Text>
        </TouchableOpacity>
      </View>

      <NovoAtivoModal visible={showModal} onClose={() => setShowModal(false)} />
    </SafeAreaView>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────

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
              <Text className="text-slate-300 text-sm flex-1" numberOfLines={1}>{seg.label}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {asset && (
                <Text className="text-xs" style={{ color: asset.pl >= 0 ? '#14b8a6' : '#ef4444' }}>
                  {asset.pl >= 0 ? '+' : ''}{(asset.plPct * 100).toFixed(1)}%
                </Text>
              )}
              <Text className="text-slate-300 text-sm font-semibold w-24 text-right">{fmt(seg.value)}</Text>
              <Text className="text-slate-500 text-xs w-10 text-right">
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
    <View className="flex-row items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
      <View className="flex-row items-center gap-3">
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
        <Text className="text-slate-200 font-medium">{seg.label}</Text>
      </View>
      <View className="items-end">
        <Text className="text-slate-200 font-semibold">{fmt(seg.value)}</Text>
        <Text className="text-slate-500 text-xs">{total > 0 ? ((seg.value / total) * 100).toFixed(1) : 0}%</Text>
      </View>
    </View>
  )
}

type AssetWithPL = {
  id: string; name: string; ticker: string; asset_type: string; broker: string
  units: number; avg_price: number; capital_invested: number; current_value: number
  pl: number; plPct: number; allocation: number | null
}

function AssetCard({ asset, color, fmt, editing, onEdit, onSave, onCancel, onEditChange, isSaving }: {
  asset: AssetWithPL; color: string; fmt: (n: number) => string
  editing: EditState | null; onEdit: () => void; onSave: () => void; onCancel: () => void
  onEditChange: (field: keyof EditState, val: string) => void; isSaving: boolean
}) {
  const plPos = asset.pl >= 0

  if (editing) {
    return (
      <View className="bg-slate-800 border border-teal-500/40 rounded-2xl p-4 gap-3">
        <Text className="text-slate-200 font-semibold">{asset.name} ({asset.ticker})</Text>
        <View className="gap-2">
          {([
            { field: 'currentValue',    label: 'Valor Atual (€)'      },
            { field: 'capitalInvested', label: 'Capital Investido (€)' },
            { field: 'units',           label: 'Unidades'              },
            { field: 'avgPrice',        label: 'Preço Médio (€)'      },
          ] as const).map(({ field, label }) => (
            <View key={field}>
              <Text className="text-slate-400 text-xs mb-1">{label}</Text>
              <TextInput
                value={editing[field]}
                onChangeText={(v) => onEditChange(field, v)}
                keyboardType="decimal-pad"
                className="bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-slate-200 text-sm"
              />
            </View>
          ))}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={onCancel} className="flex-1 bg-slate-700 rounded-xl py-2.5 items-center">
            <Text className="text-slate-300 text-sm">Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSave} disabled={isSaving} className="flex-1 bg-teal-500 rounded-xl py-2.5 items-center">
            {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-white text-sm font-semibold">Guardar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <TouchableOpacity onPress={onEdit} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3 flex-1 min-w-0">
          <View className="w-9 h-9 rounded-full items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '25' }}>
            <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{asset.ticker.slice(0, 4)}</Text>
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-slate-200 font-semibold text-sm" numberOfLines={1}>{asset.name}</Text>
            <Text className="text-slate-500 text-xs">{asset.broker} · {asset.units} un.</Text>
          </View>
        </View>
        <View className="items-end ml-2">
          <Text className="text-slate-200 font-semibold">{fmt(asset.current_value)}</Text>
          <Text className="text-xs" style={{ color: plPos ? '#14b8a6' : '#ef4444' }}>
            {plPos ? '+' : ''}{fmt(asset.pl)} ({plPos ? '+' : ''}{(asset.plPct * 100).toFixed(2)}%)
          </Text>
        </View>
      </View>
      {asset.allocation != null && (
        <View className="mt-3">
          <View className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <View className="h-1 rounded-full" style={{ width: `${Math.min(asset.allocation * 100, 100)}%`, backgroundColor: color }} />
          </View>
          <Text className="text-slate-500 text-xs mt-1">
            {(asset.allocation * 100).toFixed(1)}% do portfolio · PM {fmt(asset.avg_price)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
