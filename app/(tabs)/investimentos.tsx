import { useState, useMemo } from 'react'
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import MarketNews from '../../components/investments/MarketNews'
import NovoAtivoModal from '../../components/investments/NovoAtivoModal'

const BROKER_COLORS: Record<string, string> = {
  'XTB':                   '#ef4444',  // vermelho
  'Degiro':                '#93c5fd',  // azul bebé
  'Interactive Brokers':   '#10b981',  // verde
  'Trading212':            '#1e3a8a',  // azul escuro
  'eToro':                 '#14b8a6',  // mint
  'Revolut':               '#6366f1',  // roxo/índigo
}
function brokerColor(b: string) { return BROKER_COLORS[b] ?? '#64748b' }

type EditState = { id: string; currentValue: string; capitalInvested: string; units: string; avgPrice: string }

export default function InvestimentosScreen() {
  const { data, isLoading, updateAsset } = usePortfolio()
  const [showModal, setShowModal]       = useState(false)
  const [activeBroker, setActiveBroker] = useState<string | null>(null)
  const [editing, setEditing]           = useState<EditState | null>(null)

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

  function startEdit(asset: { id: string; current_value: number; capital_invested: number; units: number; avg_price: number }) {
    setEditing({
      id:             asset.id,
      currentValue:   String(asset.current_value),
      capitalInvested: String(asset.capital_invested),
      units:          String(asset.units),
      avgPrice:       String(asset.avg_price),
    })
  }

  async function saveEdit() {
    if (!editing) return
    const cv  = parseFloat(editing.currentValue.replace(',', '.'))
    const ci  = parseFloat(editing.capitalInvested.replace(',', '.'))
    const u   = parseFloat(editing.units.replace(',', '.'))
    const ap  = parseFloat(editing.avgPrice.replace(',', '.'))
    if (isNaN(cv) || isNaN(ci)) return
    await updateAsset.mutateAsync({
      id: editing.id,
      currentValue:    cv,
      capitalInvested: isNaN(ci) ? cv : ci,
      units:   isNaN(u)  ? undefined : u,
      avgPrice: isNaN(ap) ? undefined : ap,
    })
    setEditing(null)
  }

  // agrupar ativos por corretora
  const brokers = useMemo(() => {
    if (!data?.assets) return []
    const map: Record<string, typeof data.assets> = {}
    data.assets.forEach((a) => {
      if (!map[a.broker]) map[a.broker] = []
      map[a.broker].push(a)
    })
    return Object.entries(map).map(([broker, assets]) => ({
      broker,
      assets,
      totalValue:   assets.reduce((s, a) => s + a.current_value, 0),
      totalCapital: assets.reduce((s, a) => s + a.capital_invested, 0),
      totalPL:      assets.reduce((s, a) => s + a.pl, 0),
    }))
  }, [data?.assets])

  const filtered = activeBroker
    ? data?.assets.filter((a) => a.broker === activeBroker) ?? []
    : data?.assets ?? []

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        <NovoAtivoModal visible={showModal} onClose={() => setShowModal(false)} />

        {/* Header */}
        <View className="mt-4 mb-4 flex-row justify-between items-center">
          <View>
            <Text className="text-dark-400 text-sm">Portfolio Global</Text>
            <Text className="text-white text-2xl font-bold">Investimentos</Text>
          </View>
          <TouchableOpacity
            className="bg-mint-600 rounded-xl px-4 py-2 flex-row items-center gap-1"
            onPress={() => setShowModal(true)}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-medium text-sm">Ativo</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? <ActivityIndicator color="#14b8a6" className="mt-20" /> : (
          <>
            {/* Total geral */}
            <View className="bg-dark-800 rounded-2xl p-4 mb-4">
              <View className="flex-row justify-between items-start">
                <View>
                  <Text className="text-dark-400 text-xs mb-1">Valor Total</Text>
                  <Text className="text-white text-3xl font-bold">{fmt(data?.totalValue ?? 0)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-dark-400 text-xs mb-1">P/L Global</Text>
                  <Text className={`text-lg font-bold ${(data?.totalPL ?? 0) >= 0 ? 'text-mint-400' : 'text-red-400'}`}>
                    {(data?.totalPL ?? 0) >= 0 ? '+' : ''}{fmt(data?.totalPL ?? 0)}
                  </Text>
                  <Text className={`text-xs ${(data?.totalPL ?? 0) >= 0 ? 'text-mint-500' : 'text-red-500'}`}>
                    {(data?.totalPL ?? 0) >= 0 ? '+' : ''}{((data?.totalPLPct ?? 0) * 100).toFixed(2)}%
                  </Text>
                </View>
              </View>
              <View className="mt-3 pt-3 border-t border-dark-700">
                <Text className="text-dark-400 text-xs">Investido: {fmt(data?.totalCapital ?? 0)}</Text>
              </View>
            </View>

            {/* Corretoras — chips de filtro */}
            {brokers.length > 1 && (
              <View className="mb-4">
                <Text className="text-dark-500 text-xs uppercase tracking-wider mb-2 ml-1">Corretoras</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {/* "Todas" */}
                    <TouchableOpacity
                      onPress={() => setActiveBroker(null)}
                      className="rounded-full px-3 py-2 border flex-row items-center gap-1.5"
                      style={{
                        backgroundColor: !activeBroker ? '#14b8a622' : '#1e293b',
                        borderColor:     !activeBroker ? '#14b8a6'   : '#334155',
                      }}
                    >
                      <Text className={`text-xs font-medium ${!activeBroker ? 'text-mint-400' : 'text-dark-400'}`}>
                        Todas
                      </Text>
                    </TouchableOpacity>

                    {brokers.map(({ broker, totalValue, totalPL }) => {
                      const isActive = activeBroker === broker
                      const color    = brokerColor(broker)
                      return (
                        <TouchableOpacity
                          key={broker}
                          onPress={() => setActiveBroker(isActive ? null : broker)}
                          className="rounded-full px-3 py-2 border"
                          style={{
                            backgroundColor: isActive ? color + '22' : '#1e293b',
                            borderColor:     isActive ? color        : '#334155',
                          }}
                        >
                          <Text style={{ color: isActive ? color : '#94a3b8' }} className="text-xs font-bold">
                            {broker}
                          </Text>
                          <Text style={{ color: isActive ? color : '#475569' }} className="text-xs">
                            {fmt(totalValue)} · {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Resumo por corretora (quando "Todas" ativo) */}
            {!activeBroker && brokers.length > 0 && (
              <View className="mb-4">
                {brokers.map(({ broker, totalValue, totalCapital, totalPL }) => {
                  const color = brokerColor(broker)
                  const plPct = totalCapital > 0 ? (totalPL / totalCapital) * 100 : 0
                  return (
                    <View
                      key={broker}
                      className="bg-dark-800 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
                      style={{ borderLeftWidth: 3, borderLeftColor: color }}
                    >
                      <View>
                        <Text className="text-white font-semibold text-sm">{broker}</Text>
                        <Text className="text-dark-500 text-xs">{fmt(totalCapital)} investido</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-white font-semibold">{fmt(totalValue)}</Text>
                        <Text className={`text-xs ${totalPL >= 0 ? 'text-mint-400' : 'text-red-400'}`}>
                          {totalPL >= 0 ? '+' : ''}{fmt(totalPL)} ({plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%)
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Lista de ativos */}
            <Text className="text-dark-400 text-xs font-medium mb-2 ml-1 uppercase tracking-wider">
              Posições {activeBroker ? `· ${activeBroker}` : ''}
            </Text>
            {filtered.map((asset) => {
              const isEditing = editing?.id === asset.id
              return (
                <View key={asset.id} className="bg-dark-800 rounded-2xl p-4 mb-3">

                  {/* Cabeçalho — nome + badges */}
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-white font-semibold">{asset.name}</Text>
                        {asset.is_extra && (
                          <View className="bg-dark-700 rounded px-1.5 py-0.5">
                            <Text className="text-dark-400 text-xs">Satélite</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text className="text-dark-500 text-xs">{asset.ticker}</Text>
                        <View className="w-1 h-1 rounded-full bg-dark-600" />
                        <View className="rounded px-1.5 py-0.5" style={{ backgroundColor: brokerColor(asset.broker) + '22' }}>
                          <Text style={{ color: brokerColor(asset.broker) }} className="text-xs font-medium">{asset.broker}</Text>
                        </View>
                        <View className="bg-dark-700 rounded px-1.5 py-0.5">
                          <Text className="text-dark-400 text-xs">{asset.asset_type}</Text>
                        </View>
                      </View>
                    </View>
                    {/* botão editar / fechar */}
                    <TouchableOpacity
                      onPress={() => isEditing ? setEditing(null) : startEdit(asset)}
                      className="p-1"
                    >
                      <Ionicons name={isEditing ? 'close-circle-outline' : 'pencil-outline'} size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {isEditing ? (
                    /* ─── MODO EDIÇÃO ─── */
                    <View>
                      <View className="flex-row gap-2 mb-2">
                        <View className="flex-1">
                          <Text className="text-dark-500 text-xs mb-1">Valor atual (€)</Text>
                          <TextInput
                            className="bg-dark-700 text-white rounded-xl px-3 py-2.5 text-sm border border-mint-700"
                            value={editing!.currentValue}
                            onChangeText={(v) => setEditing((p) => p ? { ...p, currentValue: v } : p)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#475569"
                            autoFocus
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-dark-500 text-xs mb-1">Capital investido (€)</Text>
                          <TextInput
                            className="bg-dark-700 text-white rounded-xl px-3 py-2.5 text-sm border border-dark-600"
                            value={editing!.capitalInvested}
                            onChangeText={(v) => setEditing((p) => p ? { ...p, capitalInvested: v } : p)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#475569"
                          />
                        </View>
                      </View>
                      <View className="flex-row gap-2 mb-3">
                        <View className="flex-1">
                          <Text className="text-dark-500 text-xs mb-1">Nº unidades</Text>
                          <TextInput
                            className="bg-dark-700 text-white rounded-xl px-3 py-2.5 text-sm border border-dark-600"
                            value={editing!.units}
                            onChangeText={(v) => setEditing((p) => p ? { ...p, units: v } : p)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#475569"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-dark-500 text-xs mb-1">Preço médio (€)</Text>
                          <TextInput
                            className="bg-dark-700 text-white rounded-xl px-3 py-2.5 text-sm border border-dark-600"
                            value={editing!.avgPrice}
                            onChangeText={(v) => setEditing((p) => p ? { ...p, avgPrice: v } : p)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor="#475569"
                          />
                        </View>
                      </View>
                      {/* P/L calculado em tempo real */}
                      {(() => {
                        const cv = parseFloat(editing!.currentValue.replace(',', '.') || '0')
                        const ci = parseFloat(editing!.capitalInvested.replace(',', '.') || '0')
                        const pl = cv - ci
                        const plPct = ci > 0 ? (pl / ci) * 100 : 0
                        return (
                          <View className="bg-dark-700 rounded-xl px-3 py-2 mb-3 flex-row justify-between">
                            <Text className="text-dark-400 text-xs">P/L calculado</Text>
                            <Text className={`text-xs font-semibold ${pl >= 0 ? 'text-mint-400' : 'text-red-400'}`}>
                              {pl >= 0 ? '+' : ''}{fmt(pl)} ({pl >= 0 ? '+' : ''}{plPct.toFixed(2)}%)
                            </Text>
                          </View>
                        )
                      })()}
                      <TouchableOpacity
                        className="bg-mint-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
                        onPress={saveEdit}
                        disabled={updateAsset.isPending}
                      >
                        {updateAsset.isPending
                          ? <ActivityIndicator color="white" size="small" />
                          : <>
                              <Ionicons name="checkmark" size={16} color="white" />
                              <Text className="text-white font-semibold text-sm">Guardar alterações</Text>
                            </>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* ─── MODO VISUALIZAÇÃO ─── */
                    <View>
                      <View className="flex-row justify-between items-end mb-2">
                        <View>
                          <Text className="text-dark-500 text-xs">Valor atual</Text>
                          <Text className="text-white text-xl font-bold">{fmt(asset.current_value)}</Text>
                        </View>
                        <View className="items-end">
                          <Text className={`text-base font-semibold ${asset.pl >= 0 ? 'text-mint-400' : 'text-red-400'}`}>
                            {asset.pl >= 0 ? '+' : ''}{fmt(asset.pl)}
                          </Text>
                          <Text className={`text-xs ${asset.pl >= 0 ? 'text-mint-500' : 'text-red-500'}`}>
                            {asset.pl >= 0 ? '+' : ''}{(asset.plPct * 100).toFixed(2)}%
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row justify-between pt-2 border-t border-dark-700">
                        <Text className="text-dark-500 text-xs">Investido: {fmt(asset.capital_invested)}</Text>
                        {asset.allocation != null && (
                          <Text className="text-dark-500 text-xs">Aloc: {(asset.allocation * 100).toFixed(0)}%</Text>
                        )}
                        {asset.units > 0 && (
                          <Text className="text-dark-500 text-xs">{asset.units} un · {fmt(asset.avg_price)}/un</Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )
            })}

            {/* Notícias do Mercado */}
            <View className="mb-4">
              <MarketNews />
            </View>

            {/* Fundo Emergência */}
            {data?.emergencyFund && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-8">
                <Text className="text-white font-semibold mb-3">Fundo de Emergência</Text>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-dark-300 text-sm">Atual</Text>
                  <Text className="text-white font-semibold">{fmt(data.emergencyFund.current_amount)}</Text>
                </View>
                <View className="flex-row justify-between mb-3">
                  <Text className="text-dark-300 text-sm">Objectivo ({data.emergencyFund.target_months} meses)</Text>
                  <Text className="text-dark-400 text-sm">{fmt(data.emergencyFund.target_amount ?? 0)}</Text>
                </View>
                <View className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-mint-500 rounded-full"
                    style={{ width: `${Math.min((data.emergencyFund.current_amount / (data.emergencyFund.target_amount ?? 1)) * 100, 100)}%` }}
                  />
                </View>
                <Text className="text-dark-400 text-xs mt-1 text-right">
                  {((data.emergencyFund.current_amount / (data.emergencyFund.target_amount ?? 1)) * 100).toFixed(1)}% do objectivo
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
