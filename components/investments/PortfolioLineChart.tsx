import React, { useState } from 'react'
import { View, Text, TouchableOpacity, LayoutChangeEvent, ActivityIndicator } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Line, Text as SvgText } from 'react-native-svg'

export type HistoryPoint = { date: string; value: number }
export type Range = '1M' | '3M' | '6M' | '1A' | 'Todo'

interface Props {
  data: HistoryPoint[]
  range: Range
  onRangeChange: (r: Range) => void
  isLoading?: boolean
}

const RANGES: Range[] = ['1M', '3M', '6M', '1A', 'Todo']
const CHART_HEIGHT = 180
const PADDING = { top: 16, bottom: 32, left: 8, right: 8 }

function formatValue(v: number) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`
  return `${v.toFixed(0)}€`
}

function formatDate(iso: string, range: Range) {
  const d = new Date(iso)
  if (range === '1M' || range === '3M') {
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
  }
  return d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })
}

export default function PortfolioLineChart({ data, range, onRangeChange, isLoading }: Props) {
  const [chartWidth, setChartWidth] = useState(320)

  function onLayout(e: LayoutChangeEvent) {
    setChartWidth(e.nativeEvent.layout.width)
  }

  const w = chartWidth - PADDING.left - PADDING.right
  const h = CHART_HEIGHT - PADDING.top - PADDING.bottom

  const minV = data.length > 0 ? Math.min(...data.map((d) => d.value)) * 0.97 : 0
  const maxV = data.length > 0 ? Math.max(...data.map((d) => d.value)) * 1.03 : 1

  function toX(i: number) {
    return PADDING.left + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w)
  }
  function toY(v: number) {
    return PADDING.top + h - ((v - minV) / (maxV - minV || 1)) * h
  }

  // Build line path
  const linePath = data
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(pt.value)}`)
    .join(' ')

  // Build fill path (close back to baseline)
  const fillPath = data.length > 0
    ? [
        linePath,
        `L ${toX(data.length - 1)} ${PADDING.top + h}`,
        `L ${toX(0)} ${PADDING.top + h}`,
        'Z',
      ].join(' ')
    : ''

  // Show 3-4 labels on X axis
  const labelIndices = data.length <= 4
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1]

  const isPositive = data.length > 1 ? data[data.length - 1].value >= data[0].value : true
  const lineColor = isPositive ? '#14b8a6' : '#ef4444'
  const gradientStart = isPositive ? '#14b8a620' : '#ef444420'

  return (
    <View>
      {/* Range selector */}
      <View className="flex-row justify-center gap-1 mb-4">
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => onRangeChange(r)}
            className={`px-3 py-1.5 rounded-lg ${range === r ? 'bg-teal-500/20' : ''}`}
          >
            <Text className={`text-xs font-semibold ${range === r ? 'text-teal-400' : 'text-slate-500'}`}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View onLayout={onLayout} style={{ height: CHART_HEIGHT }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#14b8a6" />
          </View>
        ) : data.length < 2 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#475569', fontSize: 13 }}>
              Sem dados suficientes para este período
            </Text>
          </View>
        ) : (
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
                <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal grid lines */}
            {[0, 0.5, 1].map((t) => {
              const y = PADDING.top + (1 - t) * h
              const v = minV + t * (maxV - minV)
              return (
                <React.Fragment key={t}>
                  <Line
                    x1={PADDING.left}
                    y1={y}
                    x2={chartWidth - PADDING.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={PADDING.left - 2}
                    y={y + 4}
                    fill="#475569"
                    fontSize="9"
                    textAnchor="end"
                  >
                    {formatValue(v)}
                  </SvgText>
                </React.Fragment>
              )
            })}

            {/* Gradient fill */}
            <Path d={fillPath} fill="url(#chartGrad)" />

            {/* Line */}
            <Path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* X axis labels */}
            {labelIndices.map((i) => (
              <SvgText
                key={i}
                x={toX(i)}
                y={PADDING.top + h + 20}
                fill="#475569"
                fontSize="9"
                textAnchor="middle"
              >
                {formatDate(data[i].date, range)}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>

      {/* Summary */}
      {data.length >= 2 && !isLoading && (
        <View className="flex-row justify-between mt-2 px-2">
          <View>
            <Text className="text-slate-500 text-xs">Início</Text>
            <Text className="text-slate-300 text-sm font-semibold">
              {data[0].value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-slate-500 text-xs">Variação</Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: isPositive ? '#14b8a6' : '#ef4444' }}
            >
              {isPositive ? '+' : ''}
              {((data[data.length - 1].value / data[0].value - 1) * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

