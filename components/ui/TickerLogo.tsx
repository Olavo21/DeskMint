import { useState } from 'react'
import { View, Text, Image } from 'react-native'

interface Props {
  ticker: string
  color: string
  size?: number
}

// Strip exchange suffix: "NVDA.US" → "NVDA", "VWCE.DE" → "VWCE"
function cleanSym(ticker: string) {
  return ticker.split('.')[0].toUpperCase()
}

export default function TickerLogo({ ticker, color, size = 40 }: Props) {
  const [failed, setFailed] = useState(false)
  const sym = cleanSym(ticker)
  const uri = `https://assets.parqet.com/logos/symbol/${sym}?format=png`

  const radius   = size / 2
  const fontSize = Math.max(7, Math.round(size * 0.22))

  if (failed) {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius,
        backgroundColor: color + '22',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color, fontSize, fontWeight: '800', letterSpacing: -0.5 }}>
          {sym.slice(0, 4)}
        </Text>
      </View>
    )
  }

  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: '#ffffff',
      borderWidth: 1, borderColor: '#e2e8e5',
      overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Image
        source={{ uri }}
        style={{ width: size * 0.72, height: size * 0.72 }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  )
}
