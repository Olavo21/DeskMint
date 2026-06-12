import Header from '../../components/ui/Header'
import { useState, useMemo } from 'react'
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import { usePortfolioHistory } from '../../hooks/usePortfolioHistory'
import DonutChart, { type DonutSegment } from '../../components/investments/DonutChart'
import PortfolioLineChart, { type Range } from '../../components/investments/PortfolioLineChart'
import MarketNews from '../../components/investments/MarketNews'
import NovoAtivoModal from '../../components/investments/NovoAtivoModal'
import BrokerModal from '../../components/investments/BrokerModal'
import ManageAssetsModal from '../../components/investments/ManageAssetsModal'
import TickerLogo from '../../components/ui/TickerLogo'
import { getColor } from '../../lib/portfolioColors'
import { getRegion, getRegionLabel, REGION_COLORS } from '../../lib/assetRegions'
import { getEtfInfo } from '../../lib/etfDatabase'

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
  const { width: screenW } = useWindowDimensions()
  const { data, isLoading, updateAsset, deleteAsset } = usePortfolio()
  const [activeTab, setActiveTab]         = useState<Tab>('ativos')
  const [showModal, setShowModal]         = useState(false)
  const [showBroker, setShowBroker]       = useState(false)
  const [showManage, setShowManage]       = useState(false)
  const [editAsset, setEditAsset]         = useState<AssetWithPL | null>(null)
  const [editing, setEditing]             = useState<EditState | null>(null)
  const [historyRange, setHistoryRange]   = useState<Range>('Todo')

  // Donut: 54% da largura mas nunca maior que 240px (evita overflow no web/tablet)
  const donutSize      = Math.min(Math.round(screenW * 0.54), 240)
  const donutThickness = Math.round(donutSize * 0.19)

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

  function openEdit(a: AssetWithPL) {
    setEditAsset(a)
    setEditing({ id: a.id, currentValue: String(a.current_value), capitalInvested: String(a.capital_invested), units: String(a.units), avgPrice: String(a.avg_price) })
  }

  function closeEdit() {
    setEditAsset(null)
    setEditing(null)
  }

  async function saveEdit() {
    if (!editing) return
    const p = (s: string) => parseFloat(s.replace(',', '.'))
    const cv = p(editing.currentValue), ci = p(editing.capitalInvested)
    const u = p(editing.units), ap = p(editing.avgPrice)
    if (isNaN(cv)) return
    await updateAsset.mutateAsync({ id: editing.id, currentValue: cv, capitalInvested: isNaN(ci) ? cv : ci, units: isNaN(u) ? undefined : u, avgPrice: isNaN(ap) ? undefined : ap })
    closeEdit()
  }

  function confirmDelete(asset: AssetWithPL) {
    Alert.alert(
      'Remover ativo',
      `Tens a certeza que queres remover ${asset.ticker} do portfolio? Esta acção não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => { deleteAsset.mutate(asset.id); closeEdit() } },
      ],
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-900 items-center justify-center">
        <ActivityIndicator color="#14b8a6" />
      </SafeAreaView>
    )
  }

  const totalValue   = data?.totalValue   ?? 0
  const totalPL      = data?.totalPL      ?? 0
  const totalPLPct   = data?.totalPLPct   ?? 0
  const plPos        = totalPL >= 0

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header title="Portfolio" />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Summary */}
        <View className="mx-4 mt-3 mb-4 bg-dark-800 border border-dark-600 rounded-2xl px-5 py-4">
          <Text className="text-dark-400 text-xs mb-1">Valor Total</Text>
          <Text className="text-dark-50 text-3xl font-bold">{fmt(totalValue)}</Text>
          <View className="flex-row items-center gap-2 mt-2">
            <View className="flex-row items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: plPos ? '#14b8a615' : '#ef444415' }}>
              <Ionicons name={plPos ? 'trending-up-outline' : 'trending-down-outline'} size={12} color={plPos ? '#14b8a6' : '#ef4444'} />
              <Text className="text-xs font-semibold" style={{ color: plPos ? '#14b8a6' : '#ef4444' }}>
                {plPos ? '+' : ''}{fmt(totalPL)} ({plPos ? '+' : ''}{(totalPLPct * 100).toFixed(2)}%)
              </Text>
            </View>
            <Text className="text-dark-500 text-xs">P/L total</Text>
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
                  className={`flex-row items-center gap-1.5 px-4 py-2 rounded-xl border ${active ? 'bg-teal-500/15 border-teal-500/40' : 'bg-dark-800 border-dark-600'}`}
                >
                  <Ionicons name={tab.icon as 'list-outline'} size={14} color={active ? '#14b8a6' : '#64748b'} />
                  <Text className={`text-sm font-medium ${active ? 'text-teal-400' : 'text-dark-400'}`}>{tab.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>

        {/* ── Ativos ── */}
        {activeTab === 'ativos' && (
          <View>
            {byAsset.length > 0 ? (
              <>
                {/* Donut centrado */}
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
                {/* Legenda em baixo */}
                <Legend segments={byAsset} assets={data?.assets ?? []} fmt={fmt} />
              </>
            ) : (
              <View className="mx-4 py-10 items-center">
                <Ionicons name="pie-chart-outline" size={48} color="#94a3b8" />
                <Text className="text-dark-400 text-sm mt-3">Sem ativos no portfolio</Text>
              </View>
            )}

            {/* Cabeçalho da lista de ativos com acesso rápido à edição */}
            <View className="mx-4 mt-4 flex-row items-center justify-between mb-2">
              <Text className="text-dark-300 text-xs font-semibold uppercase tracking-widest">
                {data?.assets?.length ?? 0} Posições
              </Text>
              <TouchableOpacity
                onPress={() => setShowManage(true)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800 border border-dark-600"
              >
                <Ionicons name="create-outline" size={13} color="#0d9488" />
                <Text className="text-teal-600 text-xs font-semibold">Gerir</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de ativos */}
            <View className="mx-4 gap-2">
              {(data?.assets ?? []).map((asset, i) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  color={getColor(i)}
                  fmt={fmt}
                  onEdit={() => openEdit(asset)}
                />
              ))}
            </View>

            {/* Notícias compactas */}
            <View className="mx-4 mt-6 mb-2">
              <MarketNews />
            </View>
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
            <View className="mx-4 mt-3 bg-dark-800/50 border border-dark-600/50 rounded-xl p-3">
              <Text className="text-dark-500 text-xs">
                A região é derivada automaticamente do ticker. ETFs globais e temáticos aparecem em "Resto do Mundo".
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
              <View className="mt-4 bg-dark-800 border border-dark-600 rounded-xl p-4">
                <Text className="text-dark-400 text-sm text-center">
                  Ainda não há snapshots. Os snapshots são gravados automaticamente quando actualizas um ativo.
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editAsset} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeEdit}>
        <SafeAreaView className="flex-1 bg-dark-900">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-600">
            <TouchableOpacity onPress={closeEdit}>
              <Text className="text-dark-400 text-base">Cancelar</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-dark-50 text-base font-semibold">Editar Ativo</Text>
              {editAsset && <Text className="text-dark-400 text-xs">{editAsset.name} · {editAsset.ticker}</Text>}
            </View>
            <TouchableOpacity onPress={saveEdit} disabled={updateAsset.isPending}>
              {updateAsset.isPending
                ? <ActivityIndicator size="small" color="#14b8a6" />
                : <Text className="text-teal-500 text-base font-semibold">Guardar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">
            {editing && ([
              { field: 'currentValue',    label: 'Valor Atual (€)',       hint: 'Consulta no broker' },
              { field: 'capitalInvested', label: 'Capital Investido (€)', hint: 'Total pago pelas unidades' },
              { field: 'units',           label: 'Nº Unidades',           hint: 'Quantidade detida' },
              { field: 'avgPrice',        label: 'Preço Médio (€)',       hint: 'Preço médio de compra' },
            ] as const).map(({ field, label, hint }) => (
              <View key={field} className="mb-4">
                <Text className="text-dark-400 text-xs mb-1">{label}</Text>
                <TextInput
                  value={editing[field]}
                  onChangeText={(v) => setEditing((prev) => prev ? { ...prev, [field]: v } : prev)}
                  keyboardType="decimal-pad"
                  placeholder={hint}
                  placeholderTextColor="#94a3b8"
                  className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3.5 text-dark-50 text-base"
                />
              </View>
            ))}

            {/* Danger zone */}
            <View className="mt-6 mb-2 border-t border-dark-600 pt-6">
              <Text className="text-dark-500 text-xs mb-3 uppercase tracking-widest">Zona de perigo</Text>
              <TouchableOpacity
                onPress={() => editAsset && confirmDelete(editAsset)}
                className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl py-4"
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text className="text-red-600 font-semibold text-base">Remover ativo do portfolio</Text>
              </TouchableOpacity>
            </View>
            <View className="h-8" />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* FABs — bottom-20 clears the 64px tab bar */}
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

type AssetWithPL = {
  id: string; name: string; ticker: string; asset_type: string; broker: string
  units: number; avg_price: number; capital_invested: number; current_value: number
  pl: number; plPct: number; allocation: number | null
}

function AssetCard({ asset, color, fmt, onEdit }: {
  asset: AssetWithPL; color: string; fmt: (n: number) => string; onEdit: () => void
}) {
  const plPos  = asset.pl >= 0
  const isEtf  = asset.asset_type === 'ETF'
  const etfInfo = isEtf ? getEtfInfo(asset.ticker) : null

  return (
    <View className="bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3.5">
      <View className="flex-row items-center gap-3">
        <View className="flex-shrink-0">
          <TickerLogo
            ticker={asset.ticker}
            color={color}
            size={40}
            providerDomain={etfInfo?.providerDomain}
            providerColor={etfInfo?.providerColor}
          />
        </View>

        {/* Name + meta */}
        <View className="flex-1 min-w-0">
          <Text className="text-dark-100 font-semibold text-sm" numberOfLines={1}>
            {etfInfo ? etfInfo.description : asset.name}
          </Text>
          <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
            {etfInfo && (
              <View style={{
                backgroundColor: etfInfo.providerColor + '20',
                borderWidth: 1, borderColor: etfInfo.providerColor + '40',
                borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1,
              }}>
                <Text style={{ color: etfInfo.providerColor, fontSize: 9, fontWeight: '700' }}>
                  {etfInfo.provider}
                </Text>
              </View>
            )}
            <Text className="text-dark-500 text-xs">{asset.broker} · {asset.units} un.</Text>
          </View>
        </View>

        {/* Value + P/L */}
        <View className="items-end mr-1">
          <Text className="text-dark-100 font-bold text-sm">{fmt(asset.current_value)}</Text>
          <Text className="text-xs mt-0.5" style={{ color: plPos ? '#0d9488' : '#ef4444' }}>
            {plPos ? '+' : ''}{(asset.plPct * 100).toFixed(2)}%
          </Text>
        </View>

        {/* Edit button */}
        <TouchableOpacity
          onPress={onEdit}
          className="w-8 h-8 rounded-full bg-dark-700 border border-dark-600 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={15} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Allocation bar */}
      {asset.allocation != null && (
        <View className="mt-3 ml-13">
          <View className="h-1 bg-dark-700 rounded-full overflow-hidden">
            <View className="h-1 rounded-full" style={{ width: `${Math.min(asset.allocation * 100, 100)}%`, backgroundColor: color }} />
          </View>
          <Text className="text-dark-500 text-xs mt-1">
            {(asset.allocation * 100).toFixed(1)}% · PM {fmt(asset.avg_price)}
          </Text>
        </View>
      )}
    </View>
  )
}
