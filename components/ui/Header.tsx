import { useState } from 'react'
import { View, Text, Image, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { usePlan, PLAN_COLORS } from '../../hooks/usePlan'
import PlansModal from './PlansModal'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoIcon = require('../../assets/logo-icon.png')

interface Props {
  title?: string
  subtitle?: string
  showSignOut?: boolean
  rightElement?: React.ReactNode
}

export default function Header({ title, subtitle, showSignOut = false, rightElement }: Props) {
  const profile = useAuthStore((s) => s.profile)
  const plan = usePlan()
  const [showPlans, setShowPlans] = useState(false)

  return (
    <>
    <PlansModal visible={showPlans} onClose={() => setShowPlans(false)} />
    <View
      className="flex-row items-center justify-between px-4 pt-2 pb-3"
      style={{ borderBottomWidth: 1, borderBottomColor: '#d1fae5', backgroundColor: '#f0fdf9' }}
    >
      {/* Logo + nome */}
      <View className="flex-row items-center gap-2.5">
        {logoIcon ? (
          <Image source={logoIcon} style={{ width: 36, height: 36 }} resizeMode="contain" />
        ) : (
          <View className="w-9 h-9 bg-mint-600 rounded-xl items-center justify-center">
            <Text className="text-white font-bold text-base">D</Text>
          </View>
        )}
        <View>
          <Text className="text-dark-50 font-bold text-base leading-5">DeskMint</Text>
          {(subtitle || profile?.name) && (
            <Text className="text-dark-400 text-xs leading-4">
              {subtitle ?? `Olá, ${profile?.name?.split(' ')[0]}`}
            </Text>
          )}
        </View>
      </View>

      {/* Direita — plano + sair */}
      <View className="flex-row items-center gap-2">
        {rightElement}
        {/* Badge de plano */}
        <TouchableOpacity
          onPress={() => setShowPlans(true)}
          className="rounded-full px-2.5 py-1 flex-row items-center gap-1"
          style={{ backgroundColor: PLAN_COLORS[plan.plan] + '22', borderWidth: 1, borderColor: PLAN_COLORS[plan.plan] + '55' }}
        >
          {plan.isFounder && <Text style={{ fontSize: 10 }}>⭐</Text>}
          <Text style={{ color: PLAN_COLORS[plan.plan], fontSize: 10, fontWeight: '700' }}>
            {plan.isFounder ? `Founder #${plan.founderNumber ?? '?'}` : plan.plan}
          </Text>
        </TouchableOpacity>
        {showSignOut && (
          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            className="w-8 h-8 rounded-full bg-dark-700 border border-dark-600 items-center justify-center"
          >
            <Ionicons name="log-out-outline" size={16} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
    </View>
    </>
  )
}
