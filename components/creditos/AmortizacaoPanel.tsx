import { useMemo, useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { simulateExtraAmortization } from '../../lib/creditMath'
import { sanitizeMoneyInput, parseMoneyInput, moneyMaxLength } from '../../lib/moneyInput'
import { useFmt2 } from '../../utils/format'

interface Props {
  balance: number
  annualRatePct: number
  monthlyPayment: number
  remainingMonths: number
}

// "Liquidar hoje" só aparece perto do fim do crédito, onde é uma decisão realista.
const PAYOFF_TODAY_MAX_BALANCE = 1000
const PAYOFF_TODAY_MAX_MONTHS  = 6

export default function AmortizacaoPanel({ balance, annualRatePct, monthlyPayment, remainingMonths }: Props) {
  const fmt   = useFmt2()
  const { t } = useTranslation()
  // O extra nunca precisa de passar a dívida: acima disso o resultado é o mesmo.
  const maxExtra = Math.max(Math.round(balance * 100) / 100, 0)
  const [extra, setExtra] = useState(() => sanitizeMoneyInput('100', maxExtra))

  const sim = useMemo(
    () => simulateExtraAmortization(balance, annualRatePct, monthlyPayment, remainingMonths, parseMoneyInput(extra)),
    [extra, balance, annualRatePct, monthlyPayment, remainingMonths],
  )

  const showPayoffToday = balance > 0 && (balance < PAYOFF_TODAY_MAX_BALANCE || remainingMonths < PAYOFF_TODAY_MAX_MONTHS)
  const monthsLabel = (n: number) => t(n === 1 ? 'amortization.monthOne' : 'amortization.monthsOther', { n })

  return (
    <View className="bg-dark-700 rounded-xl p-3">
      <Text className="text-dark-400 text-xs uppercase tracking-wider mb-2">
        {t('amortization.title')}
      </Text>
      <View className="flex-row items-center gap-2 mb-3">
        <Text className="text-dark-300 text-sm">€</Text>
        <TextInput
          className="bg-dark-800 rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
          style={{ color: '#0f172a', minWidth: 0 }}
          value={extra}
          onChangeText={(text) => setExtra(sanitizeMoneyInput(text, maxExtra))}
          maxLength={moneyMaxLength(maxExtra)}
          keyboardType="decimal-pad"
          placeholder="100"
          placeholderTextColor="#94a3b8"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
        />
        <Text className="text-dark-300 text-sm">{t('amortization.perMonth')}</Text>
      </View>

      {/* Prestação + extra cobrem a dívida e os juros do 1.º mês: os cartões
          "reduzes o prazo" deixariam de dizer alguma coisa útil. */}
      {sim.paidOffFirstMonth ? (
        <View className="bg-mint-900/40 rounded-lg p-3">
          <Text className="text-mint-800 text-sm font-semibold text-center">
            {t('amortization.paidOffFirstMonth', { amount: fmt(sim.interestSaved) })}
          </Text>
        </View>
      ) : (
        <View className="flex-row gap-3">
          <View className="flex-1 bg-mint-900/40 rounded-lg p-3 items-center">
            <Text className="text-mint-800 text-xs mb-1">{t('amortization.interestSaved')}</Text>
            <Text className="text-mint-800 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
              {fmt(sim.interestSaved)}
            </Text>
          </View>
          <View className="flex-1 bg-mint-900/40 rounded-lg p-3 items-center">
            <Text className="text-mint-800 text-xs mb-1">{t('amortization.termReduced')}</Text>
            <Text className="text-mint-800 text-lg font-bold" numberOfLines={1} adjustsFontSizeToFit>
              {monthsLabel(sim.monthsSaved)}
            </Text>
          </View>
        </View>
      )}

      {/* Pagar tudo de uma vez não é um extra mensal: linha à parte, com os juros
          que faltam (o máximo que alguma amortização pode poupar). */}
      {showPayoffToday && (
        <View className="mt-3 border-t border-dark-600 pt-3">
          <Text className="text-dark-200 text-sm">
            {t('amortization.payoffToday', { balance: fmt(balance), interest: fmt(sim.baselineInterest) })}
          </Text>
          <Text className="text-dark-500 text-xs mt-1">{t('amortization.earlyFeeNote')}</Text>
        </View>
      )}
    </View>
  )
}
