import { useState, useEffect } from 'react'
import { Modal, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import TickerLogo from '../ui/TickerLogo'
import StockLineChart from './StockLineChart'
import { useYahooChart } from '../../hooks/useYahooChart'
import { useCompanyNews } from '../../hooks/useCompanyNews'
import type { ChartPeriod } from '../../lib/yahooFinance'

interface Props {
  ticker: string | null
  onClose: () => void
}

function fmtPrice(v: number, currency: string): string {
  const symbol = currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${v.toFixed(2)}`
}

function fmtVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}

function fmtRelativeTime(unixSeconds: number): string {
  const diffMin = Math.max(1, Math.round((Date.now() / 1000 - unixSeconds) / 60))
  if (diffMin < 60)      return `há ${diffMin}min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24)        return `há ${diffH}h`
  return `há ${Math.round(diffH / 24)}d`
}

export default function StockDetailModal({ ticker, onClose }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>('1D')

  // Reinicia sempre para 1D quando se abre um ativo novo
  useEffect(() => { if (ticker) setPeriod('1D') }, [ticker])

  const { data: chart, isLoading: chartLoading } = useYahooChart(ticker, period)
  const baseSymbol = ticker?.split('.')[0]?.toUpperCase() ?? ''
  const { data: news = [], isLoading: newsLoading } = useCompanyNews(ticker ? baseSymbol : null)

  const meta      = chart?.meta
  const positive  = (meta?.change ?? 0) >= 0
  const color     = positive ? '#00c48c' : '#ff4d4f'

  return (
    <Modal visible={!!ticker} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* ── Secção 1: Header ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TickerLogo ticker={ticker ?? ''} color="#64748b" size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
                {meta?.longName ?? baseSymbol}
              </Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>
                {baseSymbol}{meta?.exchange ? ` · ${meta.exchange}` : ''}
              </Text>
            </View>
          </View>

          {meta ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 32, fontWeight: '800', color: '#0f172a' }}>
                {fmtPrice(meta.price, meta.currency)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <Ionicons name={positive ? 'caret-up' : 'caret-down'} size={13} color={color} />
                <Text style={{ color, fontSize: 14, fontWeight: '700' }}>
                  {fmtPrice(Math.abs(meta.change), meta.currency)} ({positive ? '+' : ''}{meta.changePercent.toFixed(2)}%)
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>· Vol: {fmtVolume(meta.volume)}</Text>
              </View>
              {meta.postMarketPrice != null && (
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                  Após horário: {fmtPrice(meta.postMarketPrice, meta.currency)}
                </Text>
              )}
            </View>
          ) : (
            // Skeleton do header enquanto a primeira resposta não chega
            <View style={{ marginBottom: 20, gap: 8 }}>
              <View style={{ width: 150, height: 30, borderRadius: 6, backgroundColor: '#f1f5f9' }} />
              <View style={{ width: 210, height: 16, borderRadius: 6, backgroundColor: '#f1f5f9' }} />
            </View>
          )}

          {/* ── Secção 2: Gráfico ── */}
          <StockLineChart
            data={chart?.points ?? []}
            period={period}
            onPeriodChange={setPeriod}
            isLoading={chartLoading && !chart}
            currency={meta?.currency ?? 'USD'}
          />

          {/* ── Secção 3: Notícias ── */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
              Notícias recentes
            </Text>
            {newsLoading ? (
              <View style={{ gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ height: 50, borderRadius: 10, backgroundColor: '#f1f5f9' }} />
                ))}
              </View>
            ) : news.length === 0 ? (
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>Sem notícias recentes.</Text>
            ) : (
              news.slice(0, 8).map((n) => (
                <TouchableOpacity
                  key={n.id}
                  onPress={() => Linking.openURL(n.url)}
                  activeOpacity={0.7}
                  style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                >
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.3 }}>
                    {n.source} · {fmtRelativeTime(n.datetime)}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '600', lineHeight: 19 }} numberOfLines={2}>
                    {n.headline}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
