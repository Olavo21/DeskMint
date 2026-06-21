import { View, Text } from 'react-native'

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`

const TIPS = [
  {
    icon: '📉',
    title: 'Renegocia o spread',
    text: 'Se a tua taxa variável tem um spread acima de 1,5%, contacta o banco ou compara propostas — bancos costumam baixar o spread para reter clientes com bom histórico.',
  },
  {
    icon: '🔗',
    title: 'Consolidação de créditos',
    text: 'Vários créditos pequenos (carro, pessoal) podem ser unidos num só, normalmente com uma taxa mais baixa e uma única prestação — mais simples de gerir.',
  },
  {
    icon: '🛡️',
    title: 'Fundo de emergência primeiro',
    text: 'Antes de amortizares antecipadamente, garante 3 a 6 meses de despesas num fundo de emergência. Amortizar sem rede de segurança pode obrigar-te a outro crédito mais caro depois.',
  },
  {
    icon: '⚖️',
    title: 'Compara taxa do crédito vs. retorno de investir',
    text: 'Se a taxa do crédito é menor do que o retorno esperado a investir esse dinheiro, pode compensar mais investir do que amortizar antecipadamente — e vice-versa.',
  },
]

interface Props {
  totalMonthlyPayments: number
  income: number
}

export default function DicasFinanceiras({ totalMonthlyPayments, income }: Props) {
  const effortRate = income > 0 ? totalMonthlyPayments / income : 0
  const isHealthy = effortRate < 0.33

  return (
    <View className="gap-3">
      <Text className="text-dark-50 font-semibold text-base mb-1">Saúde Financeira</Text>

      {income > 0 && (
        <View
          className="rounded-2xl p-4 border"
          style={{
            backgroundColor: isHealthy ? '#14332a' : '#3f1d1d',
            borderColor: isHealthy ? '#16a34a' : '#ef4444',
          }}
        >
          <Text className="text-xs mb-1" style={{ color: isHealthy ? '#86efac' : '#fca5a5' }}>
            Taxa de Esforço (prestações / rendimento líquido)
          </Text>
          <Text className="text-2xl font-bold mb-1" style={{ color: isHealthy ? '#86efac' : '#fca5a5' }}>
            {fmtPct(effortRate)}
          </Text>
          <Text className="text-xs" style={{ color: isHealthy ? '#86efac' : '#fca5a5' }}>
            {isHealthy
              ? 'Dentro do recomendado (abaixo de 33%). Continua assim.'
              : 'Acima dos 33% recomendados — considera renegociar ou consolidar créditos.'}
          </Text>
        </View>
      )}

      {TIPS.map((tip) => (
        <View key={tip.title} className="bg-dark-800 rounded-2xl p-4 border border-dark-700 flex-row gap-3">
          <Text className="text-2xl">{tip.icon}</Text>
          <View className="flex-1">
            <Text className="text-dark-50 font-semibold text-sm mb-1">{tip.title}</Text>
            <Text className="text-dark-400 text-xs leading-5">{tip.text}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}
