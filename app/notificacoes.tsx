import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import Header from '../components/ui/Header'
import { useDashboard } from '../hooks/useDashboard'
import { useBudgetTargets } from '../hooks/useBudgetTargets'
import { useDashboardStore } from '../stores/dashboardStore'
import { useAuthStore } from '../stores/authStore'
import { computeBudgetAlerts, BUDGET_TIPS, type BudgetAlert, type BudgetCategory } from '../lib/budgetAlerts'

const SEVERITY_STYLE = {
  warning:  { bg: '#fffbeb', border: '#fde68a', color: '#b45309', icon: 'alert-circle' as const },
  critical: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: 'warning' as const },
}

const PHRASING: Record<BudgetCategory, { subject: string; verb: string }> = {
  needs:   { subject: 'as tuas Necessidades',     verb: 'estão' },
  wants:   { subject: 'o teu Disponível/Lazer',   verb: 'está' },
  savings: { subject: 'a tua Poupança',           verb: 'está' },
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

function buildMessage(alert: BudgetAlert, firstName: string) {
  const { subject, verb } = PHRASING[alert.category]
  const actual = pct(alert.actualPct)
  const target = pct(alert.targetPct)
  if (alert.direction === 'over') {
    const suggestion = alert.category === 'needs' ? 'rever custos fixos' : 'rever os gastos nesta categoria'
    return `Atenção ${firstName}, ${subject} ${verb} em ${actual}, excedendo o teu objetivo de ${target}. Sugerimos ${suggestion}.`
  }
  return `Atenção ${firstName}, ${subject} ${verb} em ${actual}, abaixo do teu objetivo de ${target}. Sugerimos reforçar a tua estratégia de poupança.`
}

function AlertCard({ alert, firstName }: { alert: BudgetAlert; firstName: string }) {
  const [expanded, setExpanded] = useState(false)
  const style = SEVERITY_STYLE[alert.severity as 'warning' | 'critical']

  return (
    <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: style.bg, borderWidth: 1, borderColor: style.border }}>
      <View className="flex-row items-start gap-3">
        <Ionicons name={style.icon} size={20} color={style.color} />
        <View className="flex-1">
          <Text className="font-semibold text-sm mb-1" style={{ color: style.color }}>{alert.label}</Text>
          <Text className="text-sm leading-5" style={{ color: '#1e293b' }}>
            {buildMessage(alert, firstName)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => setExpanded((p) => !p)}
        className="flex-row items-center gap-1.5 mt-3"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-xs font-semibold" style={{ color: style.color }}>
          {expanded ? 'Ocultar dicas' : 'Ver dicas de otimização'}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={style.color} />
      </TouchableOpacity>

      {expanded && (
        <View className="mt-2 gap-2">
          {BUDGET_TIPS[alert.category].map((tip, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <Text className="text-xs" style={{ color: style.color }}>•</Text>
              <Text className="text-xs flex-1 leading-4" style={{ color: '#334155' }}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export default function NotificacoesScreen() {
  const profile = useAuthStore((s) => s.profile)
  const { selectedMonth: MONTH, selectedYear: YEAR } = useDashboardStore()
  const { data, isLoading } = useDashboard(MONTH, YEAR)
  const targets = useBudgetTargets()
  const firstName = profile?.name?.split(' ')[0] ?? 'utilizador'

  const alerts = data?.budgetRule
    ? computeBudgetAlerts(
        { needs: data.budgetRule.needs_pct, wants: data.lazerPct ?? 0, savings: data.budgetRule.savings_pct },
        targets
      ).filter((a) => a.severity !== 'ok')
    : []

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header subtitle="Notificações Inteligentes" />
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2 mb-5">
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text className="text-dark-50 text-2xl font-bold">Alertas do Orçamento</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#14b8a6" className="mt-10" />
        ) : alerts.length === 0 ? (
          <View className="bg-dark-800 rounded-2xl p-6 items-center mt-6">
            <Text className="text-3xl mb-2">🎉</Text>
            <Text className="text-dark-50 font-semibold mb-1">Tudo dentro da meta este mês</Text>
            <Text className="text-dark-400 text-sm text-center">
              As tuas Necessidades, Lazer e Poupança estão alinhadas com os teus objetivos.
            </Text>
          </View>
        ) : (
          alerts.map((a) => <AlertCard key={a.category} alert={a} firstName={firstName} />)
        )}

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  )
}
