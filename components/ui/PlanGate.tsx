import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePlan, PLAN_NAMES, FOUNDER_SLOTS } from '../../hooks/usePlan'

interface Props {
  children: React.ReactNode
  feature: string          // descrição da funcionalidade bloqueada
  requiredPlan?: 'BASE' | 'PRO' | 'FOUNDER'
  onUpgrade?: () => void
}

export default function PlanGate({ children, feature, requiredPlan = 'BASE', onUpgrade }: Props) {
  const plan = usePlan()

  // verificar acesso com base no plano requerido
  const hasAccess = plan.isFounder ||
    (['PRO', 'FOUNDER'] as string[]).includes(plan.plan) ||
    (requiredPlan === 'BASE' && (['BASE', 'PRO', 'FOUNDER'] as string[]).includes(plan.plan))

  if (hasAccess) return <>{children}</>

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-16 h-16 bg-dark-800 rounded-2xl items-center justify-center mb-4">
        <Ionicons name="lock-closed" size={28} color="#f59e0b" />
      </View>

      <Text className="text-white text-lg font-bold text-center mb-2">
        Funcionalidade {PLAN_NAMES[requiredPlan]}
      </Text>
      <Text className="text-dark-400 text-sm text-center mb-6 leading-5">
        {feature} está disponível no plano{' '}
        <Text className="text-yellow-400 font-semibold">{PLAN_NAMES[requiredPlan]}</Text>
        {' '}ou superior.
      </Text>

      {/* Plano Founder em destaque */}
      <View className="w-full bg-yellow-900/30 border border-yellow-600 rounded-2xl p-4 mb-4">
        <View className="flex-row items-center gap-2 mb-2">
          <Text className="text-lg">⭐</Text>
          <Text className="text-yellow-400 font-bold">Plano Founder</Text>
          <View className="bg-yellow-600 rounded-full px-2 py-0.5 ml-auto">
            <Text className="text-black text-xs font-bold">VITALÍCIO</Text>
          </View>
        </View>
        <Text className="text-yellow-200 text-xs leading-4 mb-3">
          Acesso 100% premium para sempre. Apenas {FOUNDER_SLOTS} vagas disponíveis para os primeiros membros.
        </Text>
        <TouchableOpacity
          className="bg-yellow-500 rounded-xl py-3 items-center"
          onPress={onUpgrade}
        >
          <Text className="text-black font-bold text-sm">Quero ser Founder ⭐</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onUpgrade} className="py-2">
        <Text className="text-dark-500 text-xs underline">Ver todos os planos</Text>
      </TouchableOpacity>
    </View>
  )
}
