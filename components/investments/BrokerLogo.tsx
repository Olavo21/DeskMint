import Svg, { Rect, Text as SvgText, Path, Defs, LinearGradient, Stop } from 'react-native-svg'
import type { BrokerId } from '../../lib/csvParsers'

// Brand-accurate colours + marks for each supported broker
const LOGOS: Record<BrokerId, { bg: string; bg2?: string; text: string; label: string; fontSize?: number }> = {
  trading212:    { bg: '#0FCC77', bg2: '#0EA669', text: '#fff', label: '212' },
  degiro:        { bg: '#FF5400', bg2: '#D94600', text: '#fff', label: 'D',   fontSize: 0.48 },
  xtb:           { bg: '#003FA5', bg2: '#002E7A', text: '#fff', label: 'XTB', fontSize: 0.26 },
  traderepublic: { bg: '#1A1A1A', bg2: '#101010', text: '#fff', label: 'TR',  fontSize: 0.30 },
  ibkr:          { bg: '#C8212B', bg2: '#A41B23', text: '#fff', label: 'IB',  fontSize: 0.33 },
  revolut:       { bg: '#141414', bg2: '#0A0A0A', text: '#fff', label: 'R',   fontSize: 0.48 },
  other:         { bg: '#334155', bg2: '#1e293b', text: '#94a3b8', label: '···', fontSize: 0.28 },
}

type Props = { id: BrokerId; size?: number }

export default function BrokerLogo({ id, size = 40 }: Props) {
  const logo   = LOGOS[id] ?? LOGOS.other
  const r      = size * 0.22
  const fSize  = size * (logo.fontSize ?? 0.32)
  const gradId = `grad_${id}`

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={logo.bg}           stopOpacity={1} />
          <Stop offset="1" stopColor={logo.bg2 ?? logo.bg} stopOpacity={1} />
        </LinearGradient>
      </Defs>

      {/* Background */}
      <Rect x={0} y={0} width={size} height={size} rx={r} ry={r} fill={`url(#${gradId})`} />

      {/* Subtle inner highlight */}
      <Rect
        x={1} y={1} width={size - 2} height={size * 0.45}
        rx={r - 1} ry={r - 1}
        fill="#ffffff" fillOpacity={0.08}
      />

      {/* Brand text */}
      <SvgText
        x={size / 2}
        y={size / 2 + fSize * 0.38}
        fill={logo.text}
        fontSize={fSize}
        fontWeight="800"
        textAnchor="middle"
        letterSpacing={logo.label.length > 2 ? -0.5 : 0}
      >
        {logo.label}
      </SvgText>
    </Svg>
  )
}
