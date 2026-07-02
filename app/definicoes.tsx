import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../stores/authStore'
import { usePlan, PLAN_NAMES, PLAN_COLORS } from '../hooks/usePlan'
import { supabase } from '../lib/supabase'

// ── StepperRow ──────────────────────────────────────────────────────────────

function StepperRow({ label, value, color, onChange }: {
  label: string; value: number; color: string; onChange: (v: number) => void
}) {
  const canDec = value > 5
  const canInc = value < 90
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ color: '#94a3b8', fontSize: 14 }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(5, value - 5))}
          style={{ width: 38, height: 42, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1e293b' }}
        >
          <Text style={{ color: canDec ? '#94a3b8' : '#334155', fontSize: 20, lineHeight: 22 }}>−</Text>
        </TouchableOpacity>
        <View style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontSize: 15, fontWeight: '700' }}>{value}%</Text>
        </View>
        <TouchableOpacity
          onPress={() => onChange(Math.min(90, value + 5))}
          style={{ width: 38, height: 42, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1e293b' }}
        >
          <Text style={{ color: canInc ? '#2dd4bf' : '#334155', fontSize: 20, lineHeight: 22 }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Ecrã ────────────────────────────────────────────────────────────────────

export default function DefinicoesScreen() {
  const profile    = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const plan       = usePlan()

  const [needs,   setNeeds]   = useState(profile?.target_needs   ?? 50)
  const [wants,   setWants]   = useState(profile?.target_wants   ?? 30)
  const [savings, setSavings] = useState(profile?.target_savings ?? 20)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)

  const soma    = needs + wants + savings
  const somaOk  = soma === 100
  const planColor = PLAN_COLORS[plan.plan as keyof typeof PLAN_COLORS] ?? '#64748b'
  const planName  = PLAN_NAMES[plan.plan  as keyof typeof PLAN_NAMES]  ?? plan.plan

  async function guardar() {
    if (!somaOk || !profile) return
    setSaving(true)
    const { data, error } = await supabase
      .from('dm_profiles')
      .update({ target_needs: needs, target_wants: wants, target_savings: savings })
      .eq('id', profile.id)
      .select()
      .single()
    setSaving(false)
    if (error || !data) {
      Alert.alert('Erro', 'Não foi possível guardar. Tenta novamente.')
      return
    }
    setProfile(data)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>

      {/* ── Barra de topo ─────────────────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: '#1e293b',
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back-outline" size={22} color="#64748b" />
        </TouchableOpacity>
        <Text style={{ color: '#f8fafc', fontSize: 17, fontWeight: '700', flex: 1 }}>Definições</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Regra Orçamental ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', padding: 20 }}>
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
            Regra Orçamental
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>
            Define como distribuir o teu rendimento mensal
          </Text>

          <StepperRow label="Necessidades" value={needs}   color="#f59e0b" onChange={setNeeds}   />
          <View style={{ height: 1, backgroundColor: '#0f172a' }} />
          <StepperRow label="Lazer"        value={wants}   color="#8b5cf6" onChange={setWants}   />
          <View style={{ height: 1, backgroundColor: '#0f172a' }} />
          <StepperRow label="Poupança"     value={savings} color="#2dd4bf" onChange={setSavings} />

          {/* Barra tricolor */}
          <View style={{ flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', backgroundColor: '#0f172a', marginTop: 18 }}>
            <View style={{ flex: needs,   backgroundColor: '#f59e0b' }} />
            <View style={{ flex: wants,   backgroundColor: '#8b5cf6' }} />
            <View style={{ flex: savings, backgroundColor: '#2dd4bf' }} />
            {soma < 100 && <View style={{ flex: 100 - soma, backgroundColor: '#334155' }} />}
          </View>

          {/* Indicador soma */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <Text style={{ color: '#475569', fontSize: 12 }}>Total alocado</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: somaOk ? '#34d399' : '#ef4444', fontSize: 14, fontWeight: '700' }}>
                {soma}%
              </Text>
              <Ionicons
                name={somaOk ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={somaOk ? '#34d399' : '#ef4444'}
              />
            </View>
          </View>
          {!somaOk && (
            <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>
              {soma < 100
                ? `A soma tem de ser 100%. Faltam +${100 - soma}%.`
                : `A soma tem de ser 100%. Excede em ${soma - 100}%.`}
            </Text>
          )}
        </View>

        {/* ── Botão Guardar ─────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={guardar}
          disabled={!somaOk || saving}
          style={{
            backgroundColor: !somaOk || saving ? '#1e293b' : '#14b8a6',
            borderRadius: 16, padding: 16, alignItems: 'center',
            borderWidth: 1,
            borderColor: !somaOk || saving ? '#334155' : '#14b8a6',
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ccfbef" />
          ) : success ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color="#ccfbef" />
              <Text style={{ color: '#ccfbef', fontSize: 15, fontWeight: '700' }}>Guardado!</Text>
            </View>
          ) : (
            <Text style={{ color: !somaOk ? '#475569' : '#ccfbef', fontSize: 15, fontWeight: '700' }}>
              Guardar alterações
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Conta ─────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' }}>
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', padding: 16, paddingBottom: 8 }}>
            Conta
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#0f172a' }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>Nome</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>{profile?.name ?? '—'}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#0f172a' }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>Plano</Text>
            <View style={{ backgroundColor: planColor + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: planColor + '40' }}>
              <Text style={{ color: planColor, fontSize: 12, fontWeight: '700' }}>
                {plan.isFounder ? `Founder #${plan.founderNumber ?? '?'}` : planName}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => supabase.auth.signOut()}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#0f172a' }}
          >
            <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Terminar sessão</Text>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <Text style={{ color: '#334155', fontSize: 10, textAlign: 'center', lineHeight: 15 }}>
          DeskMint · Finanças pessoais
        </Text>

      </ScrollView>
    </SafeAreaView>
  )
}
