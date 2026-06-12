import { ScrollView, View, Text, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDashboard } from '../../hooks/useDashboard'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import Header from '../../components/ui/Header'

const now   = new Date()
const MONTH = now.getMonth() + 1
const YEAR  = now.getFullYear()

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="bg-dark-800 rounded-2xl p-4 flex-1">
      <Text className="text-dark-400 text-xs mb-1">{label}</Text>
      <Text className="text-dark-50 text-xl font-bold">{value}</Text>
      {sub ? <Text className="text-dark-400 text-xs mt-1">{sub}</Text> : null}
    </View>
  )
}

function RuleRow({ label, pct, ideal, amt, fmt }: { label: string; pct: number; ideal: number; amt: number; fmt: (n: number) => string }) {
  const over = pct > ideal && label !== 'Poupança'
  return (
    <View className="mb-3">
      <View className="flex-row justify-between items-center mb-1">
        <Text className="text-dark-300 text-sm">{label}</Text>
        <View className="flex-row items-center gap-2">
          <Text className={`text-sm font-semibold ${over ? 'text-red-400' : 'text-mint-400'}`}>
            {(pct * 100).toFixed(1)}%
          </Text>
          <Text className="text-dark-300 text-sm">{fmt(amt)}</Text>
        </View>
      </View>
      <View className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-mint-500'}`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </View>
    </View>
  )
}

export default function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile)
  const { data, isLoading } = useDashboard(MONTH, YEAR)

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header showSignOut />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        <View className="mt-4 mb-6">
          <Text className="text-dark-400 text-sm capitalize">
            {now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
          </Text>
          <Text className="text-dark-50 text-2xl font-bold">Dashboard</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-20" />
        ) : (
          <>
            {/* KPIs */}
            <View className="flex-row gap-3 mb-3">
              <KpiCard label="Rendimento" value={fmt(data?.income ?? 0)} />
              <KpiCard label="Despesas" value={fmt(data?.expenses ?? 0)} />
            </View>
            <View className="flex-row gap-3 mb-6">
              <KpiCard label="Poupança" value={fmt(data?.savings ?? 0)} sub={pct(data?.savingsRate ?? 0)} />
              <KpiCard label="Disponível" value={fmt(data?.freeCash ?? 0)} sub="não alocado" />
            </View>

            {/* 50/30/20 */}
            {data?.budgetRule && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                <Text className="text-dark-50 font-semibold mb-3">Regra 50 / 30 / 20</Text>
                <RuleRow label="Necessidades" pct={data.budgetRule.needs_pct} ideal={0.5} amt={data.budgetRule.needs_amt} fmt={fmt} />
                <RuleRow label="Desejos" pct={data.budgetRule.wants_pct} ideal={0.3} amt={data.budgetRule.wants_amt} fmt={fmt} />
                <RuleRow label="Poupança" pct={data.budgetRule.savings_pct} ideal={0.2} amt={data.budgetRule.savings_amt} fmt={fmt} />
              </View>
            )}

            {/* Património */}
            <View className="bg-dark-800 rounded-2xl p-4 mb-8">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-dark-50 font-semibold">Património Líquido</Text>
                <Text className="text-mint-400 text-lg font-bold">{fmt(data?.netWorth ?? 0)}</Text>
              </View>
              {[
                { label: 'Peugeot 208 GT (líq.)', value: 16700 },
                { label: 'Portfolio XTB', value: data?.portfolioValue ?? 0 },
                { label: 'Fundo Emergência', value: data?.emergencyFund ?? 0 },
              ].map((row) => (
                <View key={row.label} className="flex-row justify-between items-center py-3 border-b border-dark-700">
                  <Text className="text-dark-300 text-sm">{row.label}</Text>
                  <Text className="text-dark-50 text-sm font-semibold">{fmt(row.value)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
