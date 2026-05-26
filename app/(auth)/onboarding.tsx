import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

type InvestorType = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'SPECULATIVE'
type Goal         = 'RETIREMENT' | 'WEALTH' | 'INCOME' | 'EDUCATION' | 'EMERGENCY' | 'OTHER'
type Horizon      = 'SHORT' | 'MEDIUM' | 'LONG'

const INVESTOR_TYPES: { key: InvestorType; label: string; desc: string; icon: string; color: string }[] = [
  { key: 'CONSERVATIVE', label: 'Conservador',   desc: 'Preservar capital, risco mínimo',      icon: '🛡️', color: '#10b981' },
  { key: 'MODERATE',     label: 'Moderado',       desc: 'Equilíbrio risco/retorno (ETFs)',      icon: '⚖️', color: '#3b82f6' },
  { key: 'AGGRESSIVE',   label: 'Agressivo',      desc: 'Crescimento máximo, aceita volatilidade', icon: '🚀', color: '#f59e0b' },
  { key: 'SPECULATIVE',  label: 'Especulativo',   desc: 'Alto risco, opcões, cripto, alavancagem', icon: '⚡', color: '#ef4444' },
]

const GOALS: { key: Goal; label: string; icon: string }[] = [
  { key: 'RETIREMENT', label: 'Reforma',           icon: '🏖️' },
  { key: 'WEALTH',     label: 'Criar Riqueza',     icon: '📈' },
  { key: 'INCOME',     label: 'Rendimento Passivo',icon: '💰' },
  { key: 'EDUCATION',  label: 'Educação',          icon: '🎓' },
  { key: 'EMERGENCY',  label: 'Fundo Emergência',  icon: '🛟' },
  { key: 'OTHER',      label: 'Outro',             icon: '🎯' },
]

const HORIZONS: { key: Horizon; label: string; sub: string }[] = [
  { key: 'SHORT',  label: '< 3 anos',   sub: 'Curto prazo' },
  { key: 'MEDIUM', label: '3 – 10 anos', sub: 'Médio prazo' },
  { key: 'LONG',   label: '> 10 anos',  sub: 'Longo prazo' },
]

export default function OnboardingScreen() {
  const { session, setProfile } = useAuthStore()
  const [step, setStep]                 = useState(1)
  const [investorType, setInvestorType] = useState<InvestorType>('MODERATE')
  const [goal, setGoal]                 = useState<Goal>('WEALTH')
  const [horizon, setHorizon]           = useState<Horizon>('LONG')
  const [monthly, setMonthly]           = useState('')
  const [name, setName]                 = useState('')
  const [loading, setLoading]           = useState(false)

  async function handleFinish() {
    setLoading(true)
    const { data, error } = await supabase
      .from('dm_profiles')
      .upsert({
        id:              session!.user.id,
        name:            name.trim() || session!.user.email!.split('@')[0],
        plan:            'FREE',
        currency:        'EUR',
        investor_type:   investorType,
        invest_goal:     goal,
        time_horizon:    horizon,
        monthly_invest:  parseFloat(monthly.replace(',', '.') || '0'),
        onboarding_done: true,
      })
      .select()
      .single()

    if (!error && data) setProfile(data as any)
    setLoading(false)
    router.replace('/(tabs)')
  }

  const STEP_TITLES = ['', 'O teu nome', 'Perfil de Investidor', 'Objectivo', 'Horizonte Temporal']

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      {/* Progress */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row gap-1.5 mb-4">
          {[1,2,3,4].map((s) => (
            <View key={s} className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: s <= step ? '#14b8a6' : '#1e293b' }} />
          ))}
        </View>
        <Text className="text-dark-500 text-xs">{step} / 4</Text>
        <Text className="text-white text-xl font-bold mt-1">{STEP_TITLES[step]}</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" keyboardShouldPersistTaps="handled">

        {/* Step 1 — Nome */}
        {step === 1 && (
          <View>
            <Text className="text-dark-400 text-sm mb-6">Como te chamamos na app?</Text>
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-4 text-lg border border-dark-700"
              placeholder="O teu nome"
              placeholderTextColor="#475569"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
        )}

        {/* Step 2 — Tipo de investidor */}
        {step === 2 && (
          <View className="gap-3">
            <Text className="text-dark-400 text-sm mb-2">Como defines o teu perfil de risco?</Text>
            {INVESTOR_TYPES.map((t) => {
              const active = investorType === t.key
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setInvestorType(t.key)}
                  className="rounded-2xl p-4 border flex-row items-center gap-3"
                  style={{ backgroundColor: active ? t.color + '22' : '#1e293b', borderColor: active ? t.color : '#334155' }}
                >
                  <Text className="text-2xl">{t.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{t.label}</Text>
                    <Text className="text-dark-400 text-xs mt-0.5">{t.desc}</Text>
                  </View>
                  {active && <View className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Step 3 — Objectivo */}
        {step === 3 && (
          <View>
            <Text className="text-dark-400 text-sm mb-4">Qual o principal objectivo dos teus investimentos?</Text>
            <View className="flex-row flex-wrap gap-3">
              {GOALS.map((g) => {
                const active = goal === g.key
                return (
                  <TouchableOpacity
                    key={g.key}
                    onPress={() => setGoal(g.key)}
                    className="rounded-2xl p-4 border items-center"
                    style={{
                      backgroundColor: active ? '#14b8a622' : '#1e293b',
                      borderColor: active ? '#14b8a6' : '#334155',
                      width: '47%',
                    }}
                  >
                    <Text className="text-2xl mb-1">{g.icon}</Text>
                    <Text className={`text-sm font-medium text-center ${active ? 'text-mint-400' : 'text-dark-300'}`}>{g.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Step 4 — Horizonte + aporte */}
        {step === 4 && (
          <View className="gap-4">
            <Text className="text-dark-400 text-sm mb-2">Quanto tempo planeias manter os investimentos?</Text>
            {HORIZONS.map((h) => {
              const active = horizon === h.key
              return (
                <TouchableOpacity
                  key={h.key}
                  onPress={() => setHorizon(h.key)}
                  className="rounded-2xl px-5 py-4 border flex-row justify-between items-center"
                  style={{ backgroundColor: active ? '#14b8a622' : '#1e293b', borderColor: active ? '#14b8a6' : '#334155' }}
                >
                  <View>
                    <Text className={`font-semibold ${active ? 'text-mint-400' : 'text-white'}`}>{h.label}</Text>
                    <Text className="text-dark-500 text-xs">{h.sub}</Text>
                  </View>
                  {active && <View className="w-3 h-3 rounded-full bg-mint-500" />}
                </TouchableOpacity>
              )
            })}

            <View className="mt-2">
              <Text className="text-dark-400 text-xs mb-1.5 ml-1">Aporte mensal (€)</Text>
              <TextInput
                className="bg-dark-800 text-white rounded-xl px-4 py-3.5 text-base border border-dark-700"
                placeholder="ex: 200"
                placeholderTextColor="#475569"
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>

      {/* Botões */}
      <View className="px-6 pb-6 gap-3">
        {step < 4 ? (
          <TouchableOpacity
            className="bg-mint-600 rounded-xl py-4 items-center"
            onPress={() => setStep(step + 1)}
          >
            <Text className="text-white font-semibold text-base">Continuar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-mint-600 rounded-xl py-4 items-center"
            onPress={handleFinish}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">Entrar na DeskMint 🚀</Text>
            }
          </TouchableOpacity>
        )}
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} className="items-center py-2">
            <Text className="text-dark-500 text-sm">← Voltar</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}
