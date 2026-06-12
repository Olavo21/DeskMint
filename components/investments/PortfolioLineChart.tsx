import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, LayoutChangeEvent,
  ActivityIndicator, PanResponder,
} from 'react-native'
import Svg, {
  Path, Defs, LinearGradient, Stop, Line,
  Text as SvgText, Circle, Rect,
} from 'react-native-svg'

export type HistoryPoint = { date: string; value: number }
export type Range = '1M' | '3M' | 'YTD' | '1A' | '5A' | 'Max'

interface Props {
  data: HistoryPoint[]
  range: Range
  onRangeChange: (r: Range) => void
  isLoading?: boolean
}

const RANGES: Range[] = ['1M', '3M', 'YTD', '1A', '5A', 'Max']
const H = 220
const PAD = { top: 20, bottom: 34, left: 40, right: 12 }
const TIP_W = 110
const TIP_H = 40

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}k`
  return v.toFixed(0)
}

function fmtXLabel(iso: string, range: Range): string {
  const d = new Date(iso)
  if (range === '1M' || range === '3M')
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  return d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })
}

function fmtTooltipDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
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

export default function PortfolioLineChart({ data, range, onRangeChange, isLoading }: Props) {
  const [svgWidth, setSvgWidth] = useState(320)
  const [tip, setTip] = useState<{
    x: number; y: number; value: number; date: string
  } | null>(null)
  const tipTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Refs to avoid stale closures inside the PanResponder (created once)
  const dataRef   = useRef(data)
  const pointsRef = useRef<{ x: number; y: number }[]>([])
  const wRef      = useRef(0)

  const w = svgWidth - PAD.left - PAD.right
  const h = H - PAD.top - PAD.bottom

  const minV = useMemo(
    () => (data.length ? Math.min(...data.map((d) => d.value)) * 0.96 : 0),
    [data],
  )
  const maxV = useMemo(
    () => (data.length ? Math.max(...data.map((d) => d.value)) * 1.04 : 1),
    [data],
  )

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
  const clr   = isPos ? '#14b8a6' : '#ef4444'

  const gridTs = [0, 0.33, 0.66, 1]
  const xIdxs  = data.length <= 4
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1]

  function handleTouch(lx: number) {
    const d  = dataRef.current
    const ps = pointsRef.current
    const cw = wRef.current
    if (d.length < 2) return
    const i  = Math.max(0, Math.min(d.length - 1, Math.round(((lx - PAD.left) / cw) * (d.length - 1))))
    const pt = d[i]
    const px = ps[i]
    if (!pt || !px) return
    setTip({ x: px.x, y: px.y, value: pt.value, date: pt.date })
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
      tipTimer.current = setTimeout(() => setTip(null), 2000)
    },
    onPanResponderTerminate: () => setTip(null),
  })).current

  const fmtCur = (v: number) =>
    v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  return (
    <View>
      {/* ── Range selector ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 2, marginBottom: 16 }}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => onRangeChange(r)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: range === r ? 'rgba(20,184,166,0.15)' : 'transparent',
              borderWidth: 1,
              borderColor: range === r ? 'rgba(20,184,166,0.35)' : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: '600',
              color: range === r ? '#14b8a6' : '#64748b',
            }}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Chart ── */}
      <View
        style={{ height: H }}
        onLayout={(e: LayoutChangeEvent) => setSvgWidth(e.nativeEvent.layout.width)}
        {...(data.length >= 2 && !isLoading ? pan.panHandlers : {})}
      >
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : data.length < 2 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#475569', fontSize: 13 }}>Sem dados para este período</Text>
          </View>
        ) : (
          <Svg width={svgWidth} height={H} pointerEvents="none">
            <Defs>
              <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0"   stopColor={clr} stopOpacity="0.32" />
                <Stop offset="0.7" stopColor={clr} stopOpacity="0.06" />
                <Stop offset="1"   stopColor={clr} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Grid lines + Y labels */}
            {gridTs.map((t) => {
              const gy = PAD.top + (1 - t) * h
              const gv = minV + t * (maxV - minV)
              return (
                <React.Fragment key={t}>
                  <Line
                    x1={PAD.left} y1={gy}
                    x2={svgWidth - PAD.right} y2={gy}
                    stroke="#1e293b" strokeWidth="1"
                  />
                  <SvgText
                    x={PAD.left - 4} y={gy + 4}
                    fill="#475569" fontSize="8.5" textAnchor="end"
                  >
                    {fmtAxis(gv)}
                  </SvgText>
                </React.Fragment>
              )
            })}

            {/* Area fill */}
            <Path d={fillPath} fill="url(#areaGrad)" />

            {/* Line */}
            <Path
              d={linePath}
              fill="none"
              stroke={clr}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Crosshair + tooltip */}
            {tip != null && (() => {
              const tipX = tip.x + TIP_W + 10 > svgWidth - PAD.right
                ? tip.x - TIP_W - 8
                : tip.x + 8
              const tipY = Math.max(
                PAD.top + 2,
                Math.min(tip.y - TIP_H / 2, PAD.top + h - TIP_H),
              )
              return (
                <>
                  {/* Vertical rule */}
                  <Line
                    x1={tip.x} y1={PAD.top}
                    x2={tip.x} y2={PAD.top + h}
                    stroke={clr} strokeWidth="1"
                    strokeDasharray="4 3" strokeOpacity="0.65"
                  />
                  {/* Dot */}
                  <Circle
                    cx={tip.x} cy={tip.y}
                    r={5} fill={clr} stroke="#0f172a" strokeWidth="2.5"
                  />
                  {/* Bubble */}
                  <Rect
                    x={tipX} y={tipY}
                    width={TIP_W} height={TIP_H}
                    rx="7" ry="7"
                    fill="#0f172a"
                    stroke={clr} strokeWidth="1" strokeOpacity="0.45"
                  />
                  <SvgText
                    x={tipX + TIP_W / 2} y={tipY + 15}
                    fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle"
                  >
                    {fmtCur(tip.value)}
                  </SvgText>
                  <SvgText
                    x={tipX + TIP_W / 2} y={tipY + 30}
                    fill="#64748b" fontSize="9" textAnchor="middle"
                  >
                    {fmtTooltipDate(tip.date)}
                  </SvgText>
                </>
              )
            })()}

            {/* X axis labels */}
            {xIdxs.map((i) => (
              <SvgText
                key={i}
                x={points[i].x} y={PAD.top + h + 22}
                fill="#475569" fontSize="9" textAnchor="middle"
              >
                {fmtXLabel(data[i].date, range)}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      {/* ── Footer summary ── */}
      {data.length >= 2 && !isLoading && (
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between',
          alignItems: 'center', marginTop: 8, paddingHorizontal: 4,
        }}>
          <View>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Início</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600' }}>
              {fmtCur(data[0].value)}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Atual</Text>
            <Text style={{ color: '#e2e8f0', fontSize: 13, fontWeight: '600' }}>
              {fmtCur(data[data.length - 1].value)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Variação</Text>
            <Text style={{ color: clr, fontSize: 13, fontWeight: '700' }}>
              {isPos ? '+' : ''}
              {((data[data.length - 1].value / data[0].value - 1) * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
