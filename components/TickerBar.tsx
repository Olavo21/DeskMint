import { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation, Easing,
} from 'react-native-reanimated'
import TickerLogo from './ui/TickerLogo'
import StockDetailModal from './investments/StockDetailModal'
import { usePortfolio } from '../hooks/usePortfolio'
import { useTickerBarQuotes, type TickerQuote } from '../hooks/useTickerBarQuotes'
import { useTickerSparklines } from '../hooks/useYahooChart'
import { usePreferencesStore } from '../stores/preferencesStore'

const SPEED_PX_PER_SEC = 50
const SPARK_W = 40
const SPARK_H = 20

// Mini gráfico de linha sem eixos — igual ao widget de ações do X.
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <View style={{ width: SPARK_W, height: SPARK_H }} />

  const min   = Math.min(...points)
  const max   = Math.max(...points)
  const range = max - min || 1
  const step  = SPARK_W / (points.length - 1)
  const d = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(SPARK_H - ((v - min) / range) * SPARK_H).toFixed(1)}`)
    .join(' ')
  const positive = points[points.length - 1] >= points[0]

  return (
    <Svg width={SPARK_W} height={SPARK_H}>
      <Path d={d} stroke={positive ? '#00c48c' : '#ff4d4f'} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  )
}

function TickerItem({ quote, sparkline, onPress }: { quote: TickerQuote; sparkline: number[]; onPress: () => void }) {
  const { ticker, price, changePct } = quote
  const positive = changePct >= 0
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6} style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 24 }}>
      <TickerLogo ticker={ticker} color="#64748b" size={28} />
      <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
        {ticker.split('.')[0].toUpperCase()}
      </Text>
      <Text style={{ marginLeft: 6, fontSize: 12, color: '#475569' }}>
        {price.toFixed(2)}$
      </Text>
      <Text
        style={{
          marginLeft: 6, fontSize: 12, fontWeight: '600',
          color: positive ? '#00c48c' : '#ff4d4f',
        }}
      >
        {positive ? '+' : ''}{changePct.toFixed(1)}%
      </Text>
      <View style={{ marginLeft: 8 }}>
        <Sparkline points={sparkline} />
      </View>
      <Text style={{ marginLeft: 14, color: '#cbd5c9' }}>·</Text>
    </TouchableOpacity>
  )
}

export default function TickerBar() {
  const enabled = usePreferencesStore((s) => s.tickerBarEnabled)
  const { data: portfolio } = usePortfolio()
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  const assets = useMemo(() => {
    const seen = new Set<string>()
    return (portfolio?.assets ?? [])
      .filter((a) => (seen.has(a.ticker) ? false : (seen.add(a.ticker), true)))
      .map((a) => ({ ticker: a.ticker, assetType: a.asset_type }))
  }, [portfolio?.assets])
  const { data: quotes = [] } = useTickerBarQuotes(assets)
  const { data: sparklines = {} } = useTickerSparklines(assets.map((a) => a.ticker))

  const [contentWidth, setContentWidth] = useState(0)
  const translateX = useSharedValue(0)

  useEffect(() => {
    if (contentWidth <= 0) return
    translateX.value = 0
    translateX.value = withRepeat(
      withTiming(-contentWidth, {
        duration: (contentWidth / SPEED_PX_PER_SEC) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    )
    return () => cancelAnimation(translateX)
  }, [contentWidth, translateX])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  function handleLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width
    if (w > 0 && w !== contentWidth) setContentWidth(w)
  }

  if (!enabled || quotes.length === 0) return null

  return (
    <>
      <View style={{ height: 48, overflow: 'hidden', justifyContent: 'center' }}>
        <Animated.View style={[{ flexDirection: 'row' }, animatedStyle]}>
          <View style={{ flexDirection: 'row' }} onLayout={handleLayout}>
            {quotes.map((q) => (
              <TickerItem key={q.ticker} quote={q} sparkline={sparklines[q.ticker] ?? []} onPress={() => setSelectedTicker(q.ticker)} />
            ))}
          </View>
          {/* Cópia idêntica, colada logo a seguir — dá o loop sem saltos */}
          <View style={{ flexDirection: 'row' }}>
            {quotes.map((q) => (
              <TickerItem key={`${q.ticker}-dup`} quote={q} sparkline={sparklines[q.ticker] ?? []} onPress={() => setSelectedTicker(q.ticker)} />
            ))}
          </View>
        </Animated.View>
      </View>

      <StockDetailModal ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
    </>
  )
}
