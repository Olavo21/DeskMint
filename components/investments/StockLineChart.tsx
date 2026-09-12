import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, LayoutChangeEvent,
  ActivityIndicator, PanResponder,
} from 'react-native'
import Svg, {
  Path, Defs, LinearGradient, Stop, Line,
  Text as SvgText, Circle, Rect,
} from 'react-native-svg'
import type { ChartPeriod } from '../../lib/yahooFinance'

export type ChartPoint = { time: number; value: number }

interface Props {
  data: ChartPoint[]
  period: ChartPeriod
  onPeriodChange: (p: ChartPeriod) => void
  isLoading?: boolean
  currency?: string
}

const PERIODS: ChartPeriod[] = ['1D', '1S', '1M', '1A', 'TUDO']
const H = 200
const PAD = { top: 16, bottom: 26, left: 8, right: 8 }
const TIP_W = 100
const TIP_H = 38

function fmtPrice(v: number, currency: string): string {
  const symbol = currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : `${currency} `
  return `${symbol}${v.toFixed(2)}`
}

// 1D/1S mostram hora; períodos mais longos mostram data.
function fmtTipLabel(time: number, period: ChartPeriod): string {
  const d = new Date(time * 1000)
  if (period === '1D' || period === '1S') {
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: period === '1M' ? undefined : '2-digit' })
}

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const d: string[] = [`M${pts[0].x},${pts[0].y}`]
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2
    d.push(`C${cp},${pts[i - 1].y},${cp},${pts[i].y},${pts[i].x},${pts[i].y}`)
  }
  return d.join(' ')
}

function StockLineChart({ data, period, onPeriodChange, isLoading, currency = 'USD' }: Props) {
  const [svgWidth, setSvgWidth] = useState(320)
  const [tip, setTip] = useState<{ x: number; y: number; value: number; time: number } | null>(null)
  const tipTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef   = useRef(data)
  const pointsRef = useRef<{ x: number; y: number }[]>([])
  const wRef      = useRef(0)

  const w = svgWidth - PAD.left - PAD.right
  const h = H - PAD.top - PAD.bottom

  const minV = useMemo(() => (data.length ? Math.min(...data.map((d) => d.value)) * 0.998 : 0), [data])
  const maxV = useMemo(() => (data.length ? Math.max(...data.map((d) => d.value)) * 1.002 : 1), [data])

  const points = useMemo(() => {
    const n = data.length
    return data.map((pt, i) => ({
      x: PAD.left + (n <= 1 ? w / 2 : (i / (n - 1)) * w),
      y: PAD.top + h - ((pt.value - minV) / (maxV - minV || 1)) * h,
    }))
  }, [data, w, h, minV, maxV])

  useEffect(() => { dataRef.current   = data   }, [data])
  useEffect(() => { pointsRef.current = points }, [points])
  useEffect(() => { wRef.current      = w      }, [w])

  const linePath = useMemo(() => buildSmoothPath(points), [points])
  const fillPath = useMemo(() => {
    if (points.length < 2) return ''
    const base = PAD.top + h
    return `${linePath} L${points[points.length - 1].x},${base} L${points[0].x},${base} Z`
  }, [linePath, points, h])

  const isPos = data.length > 1 ? data[data.length - 1].value >= data[0].value : true
  const clr   = isPos ? '#00c48c' : '#ff4d4f'

  function handleTouch(lx: number) {
    const d  = dataRef.current
    const ps = pointsRef.current
    const cw = wRef.current
    if (d.length < 2) return
    const i  = Math.max(0, Math.min(d.length - 1, Math.round(((lx - PAD.left) / cw) * (d.length - 1))))
    const pt = d[i]
    const px = ps[i]
    if (!pt || !px) return
    setTip({ x: px.x, y: px.y, value: pt.value, time: pt.time })
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: (e) => {
      if (tipTimer.current) clearTimeout(tipTimer.current)
      handleTouch(e.nativeEvent.locationX)
    },
    onPanResponderMove: (e) => {
      if (tipTimer.current) clearTimeout(tipTimer.current)
      handleTouch(e.nativeEvent.locationX)
    },
    onPanResponderRelease: () => {
      tipTimer.current = setTimeout(() => setTip(null), 1500)
    },
    onPanResponderTerminate: () => setTip(null),
  })).current

  return (
    <View>
      {/* ── Tabs de período ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => onPeriodChange(p)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
              backgroundColor: period === p ? 'rgba(0,196,140,0.15)' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: period === p ? '#00c48c' : '#64748b' }}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Skeleton loader ── */}
      {isLoading ? (
        <View style={{ height: H, paddingHorizontal: 4, justifyContent: 'flex-end' }}>
          <View style={{ height: h, borderRadius: 12, backgroundColor: '#e2e8e5', opacity: 0.6 }} />
          <ActivityIndicator style={{ position: 'absolute', top: h / 2 - 10, alignSelf: 'center' }} color="#94a3b8" />
        </View>
      ) : data.length < 2 ? (
        <View style={{ height: H, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>Sem dados para este período</Text>
        </View>
      ) : (
        <View
          style={{ height: H }}
          onLayout={(e: LayoutChangeEvent) => setSvgWidth(e.nativeEvent.layout.width)}
          {...pan.panHandlers}
        >
          <Svg width={svgWidth} height={H} pointerEvents="none">
            <Defs>
              <LinearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"   stopColor={clr} stopOpacity="0.35" />
                <Stop offset="0.7" stopColor={clr} stopOpacity="0.05" />
                <Stop offset="1"   stopColor={clr} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            <Path d={fillPath} fill="url(#stockAreaGrad)" />
            <Path d={linePath} fill="none" stroke={clr} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {tip != null && (() => {
              const tipX = tip.x + TIP_W + 10 > svgWidth - PAD.right ? tip.x - TIP_W - 8 : tip.x + 8
              const tipY = Math.max(PAD.top + 2, Math.min(tip.y - TIP_H / 2, PAD.top + h - TIP_H))
              return (
                <>
                  <Line x1={tip.x} y1={PAD.top} x2={tip.x} y2={PAD.top + h} stroke={clr} strokeWidth="1" strokeDasharray="4 3" strokeOpacity="0.65" />
                  <Circle cx={tip.x} cy={tip.y} r={5} fill={clr} stroke="#ffffff" strokeWidth="2.5" />
                  <Rect x={tipX} y={tipY} width={TIP_W} height={TIP_H} rx="7" ry="7" fill="#0f172a" stroke={clr} strokeWidth="1" strokeOpacity="0.5" />
                  <SvgText x={tipX + TIP_W / 2} y={tipY + 15} fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">
                    {fmtPrice(tip.value, currency)}
                  </SvgText>
                  <SvgText x={tipX + TIP_W / 2} y={tipY + 29} fill="#94a3b8" fontSize="9" textAnchor="middle">
                    {fmtTipLabel(tip.time, period)}
                  </SvgText>
                </>
              )
            })()}
          </Svg>
        </View>
      )}
    </View>
  )
}

export default React.memo(StockLineChart)
