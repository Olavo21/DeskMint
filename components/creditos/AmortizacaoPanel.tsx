import { useMemo, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { simulateExtraAmortization } from '../../lib/creditMath'

const fmt = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

interface Props {
  balance: number
  annualRatePct: number
  monthlyPayment: number
  remainingMonths: number
}

export default function AmortizacaoPanel({ balance, annualRatePct, monthlyPayment, remainingMonths }: Props) {
  const [extra, setExtra] = useState('100')

  const sim = useMemo(() => {
    const extraVal = Number(extra.replace(',', '.')) || 0
    return simulateExtraAmortization(balance, annualRatePct, monthlyPayment, remainingMonths, extraVal)
  }, [extra, balance, annualRatePct, monthlyPayment, remainingMonths])

  return (
    <View className="bg-dark-700 rounded-xl p-3">
      <Text className="text-dark-400 text-xs uppercase tracking-wider mb-2">
        Se amortizares a mais por mês
      </Text>
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-dark-300 text-sm">€</Text>
        <TextInput
          className="bg-dark-800 rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
          style={{ color: '#0f172a', minWidth: 0 }}
          value={extra}
          onChangeText={setExtra}
          keyboardType="decimal-pad"
          placeholder="100"
          placeholderTextColor="#94a3b8"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
        />
        <Text className="text-dark-300 text-sm">/ mês extra</Text>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 bg-mint-900/40 rounded-lg p-3 items-center">
          <Text className="text-mint-800 text-xs mb-1">Poupas em juros</Text>
          <Text className="text-mint-800 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(sim.interestSaved)}
          </Text>
        </View>
        <View className="flex-1 bg-mint-900/40 rounded-lg p-3 items-center">
          <Text className="text-mint-800 text-xs mb-1">Reduzes o prazo</Text>
          <Text className="text-mint-800 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
            {Math.round(sim.monthsSaved)} meses
          </Text>
        </View>
      </View>
    </View>
  )
}
