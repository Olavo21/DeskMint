import { useState } from 'react'
import { View, Text, Image } from 'react-native'

interface Props {
  ticker: string
  color: string
  size?: number
  /** If provided, shows a mini provider logo badge in the corner */
  providerDomain?: string
  providerColor?: string
}

function cleanSym(ticker: string) {
  return ticker.split('.')[0].toUpperCase()
}

export default function TickerLogo({ ticker, color, size = 40, providerDomain, providerColor }: Props) {
  const [failed, setFailed] = useState(false)
  const [providerFailed, setProviderFailed] = useState(false)
  const sym    = cleanSym(ticker)
  const uri    = `https://assets.parqet.com/logos/symbol/${sym}?format=png`
  const radius = size / 2

  const fallback = (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: color + '22',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: Math.max(7, Math.round(size * 0.22)), fontWeight: '800', letterSpacing: -0.5 }}>
        {sym.slice(0, 4)}
      </Text>
    </View>
  )

  const badgeSize = Math.round(size * 0.45)

  return (
    <View style={{ width: size, height: size }}>
      {failed ? fallback : (
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
      )}

      {/* Provider mini-badge (bottom-right corner) */}
      {providerDomain && !providerFailed && (
        <View style={{
          position: 'absolute', bottom: -1, right: -1,
          width: badgeSize, height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: '#1e293b',
          borderWidth: 1, borderColor: '#334155',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          <Image
            source={{ uri: `https://logo.clearbit.com/${providerDomain}` }}
            style={{ width: badgeSize * 0.72, height: badgeSize * 0.72 }}
            resizeMode="contain"
            onError={() => setProviderFailed(true)}
          />
        </View>
      )}
    </View>
  )
}
