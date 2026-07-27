import { useRef, useEffect, useState } from 'react'
import { useFmt } from '../../utils/format'
import { View, Text, Animated, PanResponder, type GestureResponderEvent } from 'react-native'
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)

export type DonutSegment = {
  value: number
  color: string
  label: string
  pl?: number // lucro/perda em euros (opcional — mostrado na tooltip se definido)
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

const GAP = 1.5      // graus — micro-linha de separação reta entre fatias
const RADIAL_PAD = 16 // tolerância radial (px) para detetar o gesto perto do anel
const TOOLTIP_W = 160


function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// Arco em linha central (aberto, sem preenchimento). Sem strokeLinecap="round" —
// o default ("butt") já dá um corte reto, perpendicular ao raio, em cada ponta.
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

function SegmentArc({ d, color, thickness, isActive, dimmed }: {
  d: string
  color: string
  thickness: number
  isActive: boolean
  dimmed: boolean
}) {
  const widthAnim = useRef(new Animated.Value(thickness)).current

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: isActive ? thickness + 6 : thickness,
      useNativeDriver: false,
      friction: 7,
      tension: 90,
    }).start()
  }, [isActive, thickness])

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={widthAnim}
      opacity={dimmed ? 0.3 : 1}
    />
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
  const fmt = useFmt()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
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

  const active = activeIndex !== null ? arcs[activeIndex] : null

  function crossFade() {
    fadeAnim.setValue(0)
    Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start()
  }

  function setActive(i: number | null) {
    if (i === activeIndex) return
    setActiveIndex(i)
    crossFade()
  }

  // Identifica qual a fatia sob um ponto (x,y) local ao canvas, por ângulo + distância ao centro
  function segmentAtPoint(localX: number, localY: number): number | null {
    const dx = localX - cx
    const dy = localY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < ringR - thickness / 2 - RADIAL_PAD || dist > ringR + thickness / 2 + RADIAL_PAD) return null

    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90
    if (deg < -90) deg += 360
    if (deg >= 270) deg -= 360

    for (const arc of arcs) {
      if (deg >= arc.start && deg < arc.end) return arc.i
    }
    return null
  }

  function handleGesture(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent
    setActive(segmentAtPoint(locationX, locationY))
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleGesture,
      onPanResponderMove: handleGesture,
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
    })
  ).current

  // Hover por rato (web) — react-native-web expõe offsetX/offsetY tal como o DOM
  function handleMouseMove(e: any) {
    const { offsetX, offsetY } = e.nativeEvent
    setActive(segmentAtPoint(offsetX, offsetY))
  }

  // Posição da tooltip — ancorada ao ângulo médio da fatia ativa, fora do anel,
  // com clamp para nunca sair da área do gráfico.
  let tooltipPos: { left: number; top: number } | null = null
  if (active) {
    const mid = (active.start + active.end) / 2
    const p = polar(cx, cy, outerR + 14, mid)
    const onRightHalf = p.x >= cx
    let left = onRightHalf ? p.x + 6 : p.x - TOOLTIP_W - 6
    left = Math.max(4, Math.min(left, size - TOOLTIP_W - 4))
    let top = Math.max(0, Math.min(p.y - 30, size - 74))
    tooltipPos = { left, top }
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
            const isActive = activeIndex === arc.i
            const dimmed = activeIndex !== null && !isActive
            return (
              <SegmentArc
                key={arc.i}
                d={d}
                color={arc.color}
                thickness={thickness}
                isActive={isActive}
                dimmed={dimmed}
              />
            )
          })}
          {/* % labels sobre os arcos */}
          {showSegmentLabels && arcs.map((arc) => {
            if (arc.pct < 0.07) return null
            const dimmed = activeIndex !== null && activeIndex !== arc.i
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

        {/* Camada de gesto única — arrastar/premir nativo (PanResponder) + hover do rato (web).
            onMouseMove/onMouseLeave são extensões do react-native-web, fora dos tipos de ViewProps. */}
        <View
          {...panResponder.panHandlers}
          {...({ onMouseMove: handleMouseMove, onMouseLeave: () => setActive(null) } as object)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Texto central — overlay absoluto, não-interativo (o gesto está na camada acima) */}
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
          </Animated.View>
        </View>

        {/* Tooltip flutuante */}
        {active && tooltipPos && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: TOOLTIP_W,
              left: tooltipPos.left,
              top: tooltipPos.top,
              backgroundColor: 'rgba(15,23,42,0.92)',
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 10,
              shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '800' }} numberOfLines={1}>
              {active.label}
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 11, marginTop: 3 }}>
              Alocação: {(active.pct * 100).toFixed(1)}%
            </Text>
            {active.pl !== undefined && (
              <Text
                style={{ color: active.pl >= 0 ? '#34d399' : '#f87171', fontSize: 11, marginTop: 2, fontWeight: '700' }}
                numberOfLines={1}
              >
                Lucro/Perda: {active.pl >= 0 ? '+' : ''}{fmt(active.pl)}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  )
}
