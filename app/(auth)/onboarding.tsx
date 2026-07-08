import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require('../../assets/logo-icon.png')

type InvestorType = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'SPECULATIVE'
type Goal         = 'RETIREMENT' | 'WEALTH' | 'INCOME' | 'EDUCATION' | 'EMERGENCY' | 'OTHER'
type Horizon      = 'SHORT' | 'MEDIUM' | 'LONG'

const INVESTOR_TYPES: { key: InvestorType; label: string; desc: string; icon: string; color: string }[] = [
  { key: 'CONSERVATIVE', label: 'Conservador',  desc: 'Preservar capital, risco mínimo',          icon: '🛡️', color: '#10b981' },
  { key: 'MODERATE',     label: 'Moderado',      desc: 'Equilíbrio risco/retorno (ETFs)',          icon: '⚖️', color: '#3b82f6' },
  { key: 'AGGRESSIVE',   label: 'Agressivo',     desc: 'Crescimento máximo, aceita volatilidade',  icon: '🚀', color: '#f59e0b' },
  { key: 'SPECULATIVE',  label: 'Especulativo',  desc: 'Alto risco, opções, cripto, alavancagem', icon: '⚡', color: '#ef4444' },
]

const GOALS: { key: Goal; label: string; icon: string }[] = [
  { key: 'RETIREMENT', label: 'Reforma',            icon: '🏖️' },
  { key: 'WEALTH',     label: 'Criar Riqueza',      icon: '📈' },
  { key: 'INCOME',     label: 'Rendimento Passivo', icon: '💰' },
  { key: 'EDUCATION',  label: 'Educação',           icon: '🎓' },
  { key: 'EMERGENCY',  label: 'Fundo Emergência',   icon: '🛟' },
  { key: 'OTHER',      label: 'Outro',              icon: '🎯' },
]

const HORIZONS: { key: Horizon; label: string; sub: string }[] = [
  { key: 'SHORT',  label: '< 3 anos',    sub: 'Curto prazo' },
  { key: 'MEDIUM', label: '3 – 10 anos', sub: 'Médio prazo' },
  { key: 'LONG',   label: '> 10 anos',   sub: 'Longo prazo' },
]

const STEP_TITLES = ['', 'Como te chamamos?', 'Perfil de Investidor', 'Objetivo Principal', 'Horizonte Temporal']
const STEP_SUBS   = ['', 'O teu nome na app', 'Como defines o teu perfil de risco?', 'Qual o principal objetivo dos teus investimentos?', 'Quanto tempo planeias manter os investimentos?']

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>

      {/* Logo */}
      <View style={{ alignItems: 'center', paddingTop: 16 }}>
        <Image source={logoSource} style={{ width: 56, height: 56 }} resizeMode="contain" />
      </View>

      {/* Barra de progresso — 4 segmentos */}
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 24, paddingTop: 20 }}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={s}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: s < step ? '#14b8a6' : s === step ? '#3b82f6' : '#e2e8f0',
            }}
          />
        ))}
      </View>

      {/* Cabeçalho do passo */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}>
        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '500', marginBottom: 6 }}>
          Passo {step} de 4
        </Text>
        <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>
          {STEP_TITLES[step]}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
          {STEP_SUBS[step]}
        </Text>
      </View>

      {/* Conteúdo do passo */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Step 1 — Nome */}
        {step === 1 && (
          <View>
            <TextInput
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 16,
                fontSize: 17,
                fontWeight: '500',
                color: '#0f172a',
                borderWidth: 1.5,
                borderColor: name.length > 0 ? '#3b82f6' : '#e2e8f0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }}
              placeholder="O teu nome"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoFocus
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
            />
          </View>
        )}

        {/* Step 2 — Tipo de investidor */}
        {step === 2 && (
          <View>
            {INVESTOR_TYPES.map((t) => {
              const active = investorType === t.key
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setInvestorType(t.key)}
                  activeOpacity={0.8}
                  style={{
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 10,
                    borderWidth: 1.5,
                    borderColor:     active ? t.color : '#e2e8f0',
                    backgroundColor: active ? t.color + '12' : '#ffffff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.08 : 0.04,
                    shadowRadius: 4,
                    elevation: active ? 3 : 1,
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: t.color + '1a',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>{t.label}</Text>
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{t.desc}</Text>
                  </View>
                  {active && (
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: t.color,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={13} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Step 3 — Objetivo */}
        {step === 3 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {GOALS.map((g) => {
              const active = goal === g.key
              return (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setGoal(g.key)}
                  activeOpacity={0.8}
                  style={{
                    width: '47%',
                    borderRadius: 14,
                    padding: 16,
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor:     active ? '#14b8a6' : '#e2e8f0',
                    backgroundColor: active ? '#14b8a612' : '#ffffff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.08 : 0.04,
                    shadowRadius: 4,
                    elevation: active ? 3 : 1,
                  }}
                >
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>{g.icon}</Text>
                  <Text style={{
                    color: active ? '#0d9488' : '#0f172a',
                    fontSize: 13,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}>
                    {g.label}
                  </Text>
                  {active && (
                    <View style={{
                      marginTop: 8,
                      width: 18, height: 18, borderRadius: 9,
                      backgroundColor: '#14b8a6',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={11} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* Step 4 — Horizonte + aporte */}
        {step === 4 && (
          <View style={{ gap: 10 }}>
            {HORIZONS.map((h) => {
              const active = horizon === h.key
              return (
                <TouchableOpacity
                  key={h.key}
                  onPress={() => setHorizon(h.key)}
                  activeOpacity={0.8}
                  style={{
                    borderRadius: 14,
                    paddingHorizontal: 20,
                    paddingVertical: 18,
                    borderWidth: 1.5,
                    borderColor:     active ? '#14b8a6' : '#e2e8f0',
                    backgroundColor: active ? '#14b8a612' : '#ffffff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.08 : 0.04,
                    shadowRadius: 4,
                    elevation: active ? 3 : 1,
                  }}
                >
                  <View>
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>{h.label}</Text>
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{h.sub}</Text>
                  </View>
                  {active && (
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: '#14b8a6',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Ionicons name="checkmark" size={13} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}

            {/* Aporte mensal */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 2 }}>
                Aporte mensal (€) — opcional
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#0f172a',
                  borderWidth: 1.5,
                  borderColor: monthly.length > 0 ? '#14b8a6' : '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 3,
                  elevation: 1,
                }}
                placeholder="ex: 200"
                placeholderTextColor="#94a3b8"
                value={monthly}
                onChangeText={setMonthly}
                keyboardType="decimal-pad"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
              />
            </View>
          </View>
        )}

      </ScrollView>

      {/* Botão fixo na base */}
      <View style={{
        paddingHorizontal: 24,
        paddingBottom: 28,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: '#f8fafc',
      }}>
        <TouchableOpacity
          onPress={step < 4 ? () => setStep(step + 1) : handleFinish}
          activeOpacity={0.85}
          disabled={step === 4 && loading}
          style={{
            backgroundColor: '#0d9488',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: '#0d9488',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.28,
            shadowRadius: 8,
            elevation: 4,
            opacity: (step === 4 && loading) ? 0.7 : 1,
          }}
        >
          {step === 4 && loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>
                {step < 4 ? 'Continuar' : 'Entrar na DeskMint 🚀'}
              </Text>
          }
        </TouchableOpacity>

        {step > 1 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            style={{ alignItems: 'center', paddingTop: 14 }}
          >
            <Text style={{ color: '#94a3b8', fontSize: 14 }}>← Voltar</Text>
          </TouchableOpacity>
        )}
      </View>

    </SafeAreaView>
  )
}
