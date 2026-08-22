import { useState, useMemo } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import { usePortfolioHistory } from '../../hooks/usePortfolioHistory'
import PortfolioLineChart, { type Range } from './PortfolioLineChart'
import LotsModal from './LotsModal'
import EtfCompositionModal from './EtfCompositionModal'
import FundamentalsModal from './FundamentalsModal'
import { useLookThrough } from '../../hooks/useEtfComposition'
import { usePortfolioLimits, STATUS_COLOR } from '../../hooks/usePortfolioLimits'
import { getColor } from '../../lib/portfolioColors'
import { useFmt } from '../../utils/format'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function AnaliseModal({ visible, onClose }: Props) {
  const [range, setRange]             = useState<Range>('1M')
  const [lotsAsset, setLotsAsset]     = useState<{ id: string; ticker: string } | null>(null)
  const [compEtf, setCompEtf]         = useState<{ id: string; ticker: string } | null>(null)
  const [fundAsset, setFundAsset]     = useState<{ id: string; ticker: string; price?: number } | null>(null)
  const { data }                      = usePortfolio()
  const historyQuery                  = usePortfolioHistory(range)
  const fmt                           = useFmt()
  const lookThrough                   = useLookThrough(data?.assets ?? [])

  // Asset weights by ticker (% of total portfolio)
  const assetWeights = useMemo(() => {
    const total = data?.totalValue ?? 0
    if (total === 0) return {}
    return Object.fromEntries(
      (data?.assets ?? []).map((a) => [a.ticker, (a.current_value / total) * 100])
    )
  }, [data])

  const limitsQuery = usePortfolioLimits(assetWeights)

  // Limit form state
  const [limitTicker, setLimitTicker]   = useState('')
  const [limitMaxPct, setLimitMaxPct]   = useState('')
  const [showLimitForm, setShowLimitForm] = useState(false)

  const totalValue = data?.totalValue ?? 0
  const totalPL    = data?.totalPL    ?? 0
  const totalPLPct = data?.totalPLPct ?? 0
  const assets     = data?.assets     ?? []

  const hist           = historyQuery.data ?? []
  const periodDelta    = hist.length >= 2 ? hist[hist.length - 1].value - hist[0].value : 0
  const periodDeltaPct = hist.length >= 2 ? (hist[hist.length - 1].value / hist[0].value - 1) * 100 : 0
  const periodPos      = periodDelta >= 0
  const overallPos     = totalPL >= 0

  const sorted = [...assets].sort((a, b) => b.current_value - a.current_value)
  const maxVal = sorted[0]?.current_value ?? 1
  const top    = sorted[0]
  const topWeight = totalValue > 0 && top ? (top.current_value / totalValue * 100).toFixed(2) : '0'

  return (
    <>
    <LotsModal
      visible={!!lotsAsset}
      onClose={() => setLotsAsset(null)}
      assetId={lotsAsset?.id ?? ''}
      ticker={lotsAsset?.ticker ?? ''}
    />
    <EtfCompositionModal
      visible={!!compEtf}
      onClose={() => setCompEtf(null)}
      etfId={compEtf?.id ?? ''}
      etfTicker={compEtf?.ticker ?? ''}
    />
    <FundamentalsModal
      key={fundAsset?.id ?? 'none'}
      visible={!!fundAsset}
      onClose={() => setFundAsset(null)}
      assetId={fundAsset?.id ?? ''}
      ticker={fundAsset?.ticker ?? ''}
      currentPrice={fundAsset?.price}
    />
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-dark-900">

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 14,
          borderBottomWidth: 1, borderBottomColor: '#c9d4cf',
        }}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>Análise</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Card principal — valor + delta + gráfico ── */}
          <View style={{
            backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
            borderRadius: 20, padding: 16, marginBottom: 12,
          }}>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Valor total</Text>

            {/* Valor + variação de período */}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ color: '#0f172a', fontSize: 30, fontWeight: '800' }}>{fmt(totalValue)}</Text>
              {hist.length >= 2 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons
                    name={periodPos ? 'caret-up' : 'caret-down'}
                    size={11}
                    color={periodPos ? '#14b8a6' : '#ef4444'}
                  />
                  <Text style={{ color: periodPos ? '#14b8a6' : '#ef4444', fontSize: 14, fontWeight: '700' }}>
                    {fmt(Math.abs(periodDelta))}
                  </Text>
                </View>
              )}
            </View>

            {hist.length >= 2 && (
              <Text style={{
                color: periodPos ? '#14b8a6' : '#ef4444',
                fontSize: 12, marginTop: 2, marginBottom: 16,
              }}>
                {periodPos ? '+' : ''}{periodDeltaPct.toFixed(2)}% neste período
              </Text>
            )}

            {/* Gráfico com seletor de range */}
            <PortfolioLineChart
              data={hist}
              range={range}
              onRangeChange={setRange}
              isLoading={historyQuery.isLoading}
            />
          </View>

          {/* ── Grid 2 colunas ── */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>

            {/* Desempenho */}
            <View style={{
              flex: 1, backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
              borderRadius: 20, padding: 16,
            }}>
              <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Desempenho</Text>
              <Text style={{
                color: overallPos ? '#14b8a6' : '#ef4444',
                fontSize: 26, fontWeight: '800', marginBottom: 4,
              }}>
                {overallPos ? '+' : ''}{(totalPLPct * 100).toFixed(2)}%
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>desde compra</Text>
            </View>

            {/* Lucros e Perdas */}
            <View style={{
              flex: 1, backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
              borderRadius: 20, padding: 16,
            }}>
              <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>Lucros e Perdas</Text>
              <Text style={{
                color: overallPos ? '#14b8a6' : '#ef4444',
                fontSize: 22, fontWeight: '800', marginBottom: 8,
              }}>
                {overallPos ? '+' : ''}{fmt(totalPL)}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>Realizado: 0 €</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                Não realizado: {overallPos ? '+' : ''}{fmt(totalPL)}
              </Text>
            </View>
          </View>

          {/* ── Atribuição ── */}
          {sorted.length > 0 && (
            <View style={{
              backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
              borderRadius: 20, padding: 16,
            }}>
              <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700', marginBottom: 4 }}>
                Atribuição
              </Text>

              {/* Maior participação destaque */}
              {top && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  <Ionicons name="podium-outline" size={13} color="#14b8a6" />
                  <Text style={{ color: '#14b8a6', fontSize: 12, fontWeight: '600' }}>
                    Maior participação
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: '700' }}>
                    {top.ticker} · {topWeight}%
                  </Text>
                </View>
              )}

              {/* Barras por ativo */}
              {sorted.map((asset, i) => {
                const weight  = totalValue > 0 ? (asset.current_value / totalValue) * 100 : 0
                const barFill = asset.current_value / maxVal
                const color   = getColor(assets.findIndex((a) => a.id === asset.id))
                const pos     = asset.pl >= 0

                return (
                  <View key={asset.id} style={{ marginBottom: i < sorted.length - 1 ? 16 : 0 }}>

                    {/* Ticker row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '600' }}>{asset.ticker}</Text>
                        <TouchableOpacity
                          onPress={() => setLotsAsset({ id: asset.id, ticker: asset.ticker })}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                            backgroundColor: '#14b8a610', borderRadius: 6,
                            paddingHorizontal: 6, paddingVertical: 2,
                          }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="layers-outline" size={11} color="#14b8a6" />
                          <Text style={{ color: '#14b8a6', fontSize: 10, fontWeight: '600' }}>Lotes</Text>
                        </TouchableOpacity>
                        {asset.asset_type === 'ETF' && (
                          <TouchableOpacity
                            onPress={() => setCompEtf({ id: asset.id, ticker: asset.ticker })}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 3,
                              backgroundColor: '#6366f115', borderRadius: 6,
                              paddingHorizontal: 6, paddingVertical: 2,
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="pie-chart-outline" size={11} color="#6366f1" />
                            <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '600' }}>Composição</Text>
                          </TouchableOpacity>
                        )}
                        {asset.asset_type === 'STOCK' && (
                          <TouchableOpacity
                            onPress={() => setFundAsset({
                              id: asset.id,
                              ticker: asset.ticker,
                              price: asset.units > 0 ? asset.current_value / asset.units : undefined,
                            })}
                            style={{
                              flexDirection: 'row', alignItems: 'center', gap: 3,
                              backgroundColor: '#f9731615', borderRadius: 6,
                              paddingHorizontal: 6, paddingVertical: 2,
                            }}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="stats-chart-outline" size={11} color="#f97316" />
                            <Text style={{ color: '#f97316', fontSize: 10, fontWeight: '600' }}>Análise</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={{ color: '#475569', fontSize: 12 }}>{weight.toFixed(2)}%</Text>
                    </View>

                    {/* Bar */}
                    <View style={{
                      height: 8, backgroundColor: '#edf1ee', borderRadius: 4, overflow: 'hidden',
                      marginBottom: 5,
                    }}>
                      <View style={{
                        width: `${barFill * 100}%`,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: color,
                      }} />
                    </View>

                    {/* Value + P&L */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#64748b', fontSize: 11 }}>{fmt(asset.current_value)}</Text>
                      <Text style={{ color: pos ? '#14b8a6' : '#ef4444', fontSize: 11, fontWeight: '600' }}>
                        {pos ? '+' : ''}{fmt(asset.pl)}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* ── Exposição Consolidada (Look-Through) ── */}
          {(lookThrough.data ?? []).length > 0 && (
            <View style={{
              backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
              borderRadius: 20, padding: 16, marginTop: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
                  Exposição Real
                </Text>
                <View style={{
                  backgroundColor: '#6366f115', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '700' }}>Look-Through</Text>
                </View>
              </View>
              <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 14 }}>
                Direta + via ETFs · total do portfólio
              </Text>

              {(lookThrough.data ?? []).map((entry) => {
                const barFill = Math.min(entry.totalPct / 25, 1)
                const isConcentrated = entry.totalPct > 10
                return (
                  <View key={entry.ticker} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>{entry.ticker}</Text>
                        {entry.name && entry.name !== entry.ticker ? (
                          <Text style={{ color: '#94a3b8', fontSize: 11 }}>{entry.name}</Text>
                        ) : null}
                        {isConcentrated && (
                          <View style={{
                            backgroundColor: '#f9731615', borderRadius: 5,
                            paddingHorizontal: 5, paddingVertical: 1,
                          }}>
                            <Text style={{ color: '#f97316', fontSize: 9, fontWeight: '700' }}>CONCENTRADO</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{
                        fontSize: 13, fontWeight: '800',
                        color: isConcentrated ? '#f97316' : '#0f172a',
                      }}>
                        {entry.totalPct.toFixed(2)}%
                      </Text>
                    </View>

                    {/* Barra */}
                    <View style={{ height: 6, backgroundColor: '#edf1ee', borderRadius: 3, marginBottom: 6 }}>
                      <View style={{
                        width: `${barFill * 100}%`, height: 6, borderRadius: 3,
                        backgroundColor: isConcentrated ? '#f97316' : '#6366f1',
                      }} />
                    </View>

                    {/* Breakdown */}
                    <View style={{ gap: 3 }}>
                      {entry.directValue > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#64748b', fontSize: 11 }}>
                            Direta ({entry.ticker})
                          </Text>
                          <Text style={{ color: '#64748b', fontSize: 11 }}>
                            {entry.directPct.toFixed(2)}%
                          </Text>
                        </View>
                      )}
                      {entry.viaEtfs.map((e) => (
                        <View key={e.etfTicker} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                            Via {e.etfTicker} ({e.weight}% do ETF)
                          </Text>
                          <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                            {(e.contribution / (data?.totalValue ?? 1) * 100).toFixed(2)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })}

              <TouchableOpacity
                onPress={() => {
                  const firstEtf = (data?.assets ?? []).find((a) => a.asset_type === 'ETF')
                  if (firstEtf) setCompEtf({ id: firstEtf.id, ticker: firstEtf.ticker })
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 5, marginTop: 4, paddingVertical: 8,
                  borderTopWidth: 1, borderTopColor: '#edf1ee',
                }}
              >
                <Ionicons name="create-outline" size={13} color="#6366f1" />
                <Text style={{ color: '#6366f1', fontSize: 12, fontWeight: '600' }}>
                  Editar composição dos ETFs
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Prompt quando há ETFs mas sem composição definida */}
          {(lookThrough.data ?? []).length === 0 && (data?.assets ?? []).some((a) => a.asset_type === 'ETF') && (
            <View style={{
              backgroundColor: '#6366f108', borderWidth: 1, borderColor: '#6366f130',
              borderRadius: 16, padding: 16, marginTop: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="eye-outline" size={18} color="#6366f1" />
                <Text style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>Exposição Real</Text>
              </View>
              <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
                Tens ETFs no portfólio. Define a composição de cada um (via fact sheet) para ver a tua exposição real consolidada a cada empresa.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const firstEtf = (data?.assets ?? []).find((a) => a.asset_type === 'ETF')
                  if (firstEtf) setCompEtf({ id: firstEtf.id, ticker: firstEtf.ticker })
                }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
                  alignSelf: 'flex-start',
                }}
              >
                <Ionicons name="add" size={15} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Definir composição</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Tetos de Concentração ── */}
          <View style={{
            backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
            borderRadius: 20, padding: 16, marginTop: 12,
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>Tetos</Text>
                <View style={{ backgroundColor: '#ef444415', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>Concentração</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => { setLimitTicker(''); setLimitMaxPct(''); setShowLimitForm((v) => !v) }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showLimitForm ? 'close-circle-outline' : 'add-circle-outline'} size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 14 }}>
              Limite máximo de peso por ativo no portfólio
            </Text>

            {/* Formulário */}
            {showLimitForm && (
              <View style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: '#ef444430',
                borderRadius: 12, padding: 14, marginBottom: 14, gap: 10,
              }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Ticker</Text>
                    <TextInput
                      value={limitTicker}
                      onChangeText={(v) => setLimitTicker(v.toUpperCase())}
                      placeholder="ex: NVDA"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      autoComplete="off"
                      importantForAutofill="no"
                      style={{
                        backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                        color: '#0f172a', fontSize: 14,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>Máx. (%)</Text>
                    <TextInput
                      value={limitMaxPct}
                      onChangeText={setLimitMaxPct}
                      placeholder="ex: 20"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                      autoCorrect={false}
                      autoComplete="off"
                      importantForAutofill="no"
                      style={{
                        backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#c9d4cf',
                        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
                        color: '#0f172a', fontSize: 14,
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const tk  = limitTicker.trim()
                    const pct = Number(limitMaxPct.replace(',', '.'))
                    if (!tk || isNaN(pct) || pct <= 0 || pct > 100) return
                    await limitsQuery.upsert.mutateAsync({ ticker: tk, max_pct: pct })
                    setShowLimitForm(false)
                  }}
                  disabled={limitsQuery.upsert.isPending}
                  style={{
                    backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
                  }}
                >
                  {limitsQuery.upsert.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Guardar teto</Text>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Lista de tetos */}
            {limitsQuery.limits.length === 0 && !showLimitForm ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Ionicons name="shield-outline" size={32} color="#94a3b8" />
                <Text style={{ color: '#64748b', fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                  Sem tetos definidos.{'\n'}Toca em + para adicionar o primeiro.
                </Text>
              </View>
            ) : (
              limitsQuery.limits.map((limit) => {
                const color = STATUS_COLOR[limit.status]
                return (
                  <View key={limit.id} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>{limit.ticker}</Text>
                        {limit.status === 'exceeded' && (
                          <View style={{ backgroundColor: '#ef444415', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#ef4444', fontSize: 9, fontWeight: '700' }}>EXCEDIDO</Text>
                          </View>
                        )}
                        {limit.status === 'warning' && (
                          <View style={{ backgroundColor: '#f9731615', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#f97316', fontSize: 9, fontWeight: '700' }}>PRÓXIMO</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color, fontSize: 13, fontWeight: '700' }}>
                          {limit.currentPct.toFixed(1)}% / {limit.max_pct}%
                        </Text>
                        <TouchableOpacity
                          onPress={() => Alert.alert('Remover teto', `Remover limite de ${limit.ticker}?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Remover', style: 'destructive', onPress: () => limitsQuery.remove.mutate(limit.id) },
                          ])}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Barra */}
                    <View style={{ height: 7, backgroundColor: '#edf1ee', borderRadius: 4 }}>
                      <View style={{
                        width: `${limit.fillPct * 100}%`,
                        height: 7, borderRadius: 4,
                        backgroundColor: color,
                      }} />
                    </View>

                    {/* Margem disponível */}
                    <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 3 }}>
                      {limit.status === 'exceeded'
                        ? `Excede o teto em ${(limit.currentPct - limit.max_pct).toFixed(1)}%`
                        : `Margem: ${(limit.max_pct - limit.currentPct).toFixed(1)}%`
                      }
                    </Text>
                  </View>
                )
              })
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
    </>
  )
}
