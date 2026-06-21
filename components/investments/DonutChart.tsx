import { useRef, useEffect, useState } from 'react'
import { View, Text, Animated } from 'react-native'
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)

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

type Arc = DonutSegment & { start: number; end: number; pct: number; i: number }

const GAP = 3          // graus de espaço entre fatias
const HIT_PADDING = 24 // largura extra (px) da área de toque invisível, para além da fatia visível

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// Arco em linha central (aberto, sem preenchimento) — permite strokeLinecap="round"
// nas pontas de cada fatia, e funciona até perto de 360° sem casos especiais.
function ringArcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = start + GAP / 2
  const e = end - GAP / 2
  const span = e - s
  if (span <= 0) return ''
  const large = span > 180 ? 1 : 0
  const p1 = polar(cx, cy, r, s)
  const p2 = polar(cx, cy, r, e)
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`
}

function SegmentArc({
  d, color, thickness, isActive, dimmed, onPressIn, onPressOut,
}: {
  d: string
  color: string
  thickness: number
  isActive: boolean
  dimmed: boolean
  onPressIn: () => void
  onPressOut: () => void
}) {
  const widthAnim = useRef(new Animated.Value(thickness)).current

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: isActive ? thickness + 10 : thickness,
      useNativeDriver: false,
      friction: 6,
      tension: 80,
    }).start()
  }, [isActive, thickness])

  return (
    <>
      <AnimatedPath
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={widthAnim}
        strokeLinecap="round"
        opacity={dimmed ? 0.25 : 1}
      />
      {/* Área de toque invisível e mais larga, para um press-and-hold confortável num anel fino */}
      <Path
        d={d}
        fill="none"
        stroke="#000000"
        strokeOpacity={0.01}
        strokeWidth={thickness + HIT_PADDING}
        strokeLinecap="round"
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      />
    </>
  )
}

export default function DonutChart({
  segments,
  size = 260,
  thickness = 34,
  centerLabel,
  centerSub,
  showSegmentLabels = false,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 8
  const ringR  = outerR - thickness / 2 // raio da linha central do anel

  const total = segments.reduce((s, seg) => s + seg.value, 0)

  let angle = -90
  const arcs: Arc[] = segments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0
    const sweep = pct * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return { ...seg, start, end, pct, i }
  })

  const sel = selected !== null ? arcs[selected] : null

  function crossFade() {
    fadeAnim.setValue(0)
    Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start()
  }

  function handlePressIn(i: number) {
    setSelected(i)
    crossFade()
  }

  function handlePressOut() {
    setSelected(null)
    crossFade()
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={cx}
            cy={cy}
            r={ringR}
            fill="none"
            stroke="#d1fae5"
            strokeWidth={thickness}
            opacity={0.35}
          />
          {arcs.map((arc) => {
            const d = ringArcPath(cx, cy, ringR, arc.start, arc.end)
            if (!d) return null
            const isActive = selected === arc.i
            const dimmed = selected !== null && !isActive
            return (
              <SegmentArc
                key={arc.i}
                d={d}
                color={arc.color}
                thickness={thickness}
                isActive={isActive}
                dimmed={dimmed}
                onPressIn={() => handlePressIn(arc.i)}
                onPressOut={handlePressOut}
              />
            )
          })}
          {/* % labels sobre os arcos */}
          {showSegmentLabels && arcs.map((arc) => {
            if (arc.pct < 0.07) return null
            const dimmed = selected !== null && selected !== arc.i
            if (dimmed) return null
            const midAngle = (arc.start + arc.end) / 2
            const lp = polar(cx, cy, ringR, midAngle)
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

        {/* Texto central — overlay absoluto, não-interativo (o gesto está nos arcos) */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: thickness + 16,
          }}
        >
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
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
          </Animated.View>
        </View>
      </View>
    </View>
  )
}
