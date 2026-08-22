import { useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { usePortfolio } from '../../hooks/usePortfolio'
import { usePortfolioHistory } from '../../hooks/usePortfolioHistory'
import PortfolioLineChart, { type Range } from './PortfolioLineChart'
import { getColor } from '../../lib/portfolioColors'
import { useFmt } from '../../utils/format'

interface Props {
  visible: boolean
  onClose: () => void
}

export default function AnaliseModal({ visible, onClose }: Props) {
  const [range, setRange] = useState<Range>('1M')
  const { data }          = usePortfolio()
  const historyQuery      = usePortfolioHistory(range)
  const fmt               = useFmt()

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

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
