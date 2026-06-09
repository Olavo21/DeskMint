import { useState } from 'react'
import { View, Text, TouchableWithoutFeedback } from 'react-native'
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg'

export type DonutSegment = {
  value: number
  color: string
  label: string
}

interface Props {
  segments: DonutSegment[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerSub?: string
  showSegmentLabels?: boolean
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) {
  const GAP = 2 // degrees gap between segments
  const s = start + GAP / 2
  const e = end - GAP / 2
  const span = e - s

  if (span <= 0) return ''

  // Handle near-full circle (single segment)
  if (span >= 357) {
    const o1 = polar(cx, cy, outerR, 0)
    const o2 = polar(cx, cy, outerR, 180)
    const i1 = polar(cx, cy, innerR, 0)
    const i2 = polar(cx, cy, innerR, 180)
    return [
      `M ${o1.x} ${o1.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${o2.x} ${o2.y}`,
      `A ${outerR} ${outerR} 0 1 1 ${o1.x} ${o1.y}`,
      `Z`,
      `M ${i1.x} ${i1.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i2.x} ${i2.y}`,
      `A ${innerR} ${innerR} 0 1 0 ${i1.x} ${i1.y}`,
      `Z`,
    ].join(' ')
  }

  const large = span > 180 ? 1 : 0
  const o1 = polar(cx, cy, outerR, s)
  const o2 = polar(cx, cy, outerR, e)
  const i1 = polar(cx, cy, innerR, s)
  const i2 = polar(cx, cy, innerR, e)

  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ')
}

export default function DonutChart({
  segments,
  size = 260,
  thickness = 52,
  centerLabel,
  centerSub,
  showSegmentLabels = false,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 8
  const innerR = outerR - thickness
  const labelR  = innerR + thickness * 0.52  // midpoint of ring

  const total = segments.reduce((s, seg) => s + seg.value, 0)

  let angle = -90
  const arcs = segments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0
    const sweep = pct * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return { ...seg, start, end, pct, i }
  })

  const sel = selected !== null ? arcs[selected] : null

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={cx}
            cy={cy}
            r={innerR + thickness / 2}
            fill="none"
            stroke="#d1fae5"
            strokeWidth={thickness}
            opacity={0.35}
          />
          {arcs.map((arc) => {
            const d = arcPath(cx, cy, outerR, innerR, arc.start, arc.end)
            if (!d) return null
            const isSelected = selected === arc.i
            const dimmed = selected !== null && !isSelected
            const midAngle = (arc.start + arc.end) / 2
            const lp = polar(cx, cy, labelR, midAngle)
            const labelFontSize = size < 220 ? 9 : 10
            return (
              <Path
                key={arc.i}
                d={d}
                fill={arc.color}
                opacity={dimmed ? 0.18 : 1}
                onPress={() => setSelected(selected === arc.i ? null : arc.i)}
              />
            )
          })}
          {/* % labels on top of arcs so they're not clipped */}
          {showSegmentLabels && arcs.map((arc) => {
            if (arc.pct < 0.07) return null
            const dimmed = selected !== null && selected !== arc.i
            if (dimmed) return null
            const midAngle = (arc.start + arc.end) / 2
            const lp = polar(cx, cy, labelR, midAngle)
            const labelFontSize = size < 220 ? 9 : 10
            return (
              <SvgText
                key={`lbl-${arc.i}`}
                x={lp.x}
                y={lp.y}
                fill="#ffffff"
                fontSize={labelFontSize}
                fontWeight="700"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {(arc.pct * 100).toFixed(0)}%
              </SvgText>
            )
          })}
        </Svg>

        {/* Center text — absolute overlay */}
        <TouchableWithoutFeedback onPress={() => setSelected(null)}>
          <View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: thickness + 16,
            }}
          >
            {sel ? (
              <>
                <Text
                  style={{ color: sel.color, fontSize: 24, fontWeight: '800', textAlign: 'center' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {(sel.pct * 100).toFixed(1)}%
                </Text>
                <Text
                  style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 3, fontWeight: '500' }}
                  numberOfLines={2}
                >
                  {sel.label}
                </Text>
              </>
            ) : (
              <>
                {centerLabel && (
                  <Text
                    style={{ color: '#134e4a', fontSize: 16, fontWeight: '800', textAlign: 'center' }}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                  >
                    {centerLabel}
                  </Text>
                )}
                {centerSub && (
                  <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 3, fontWeight: '500' }}>
                    {centerSub}
                  </Text>
                )}
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  )
}
