import { useState, useEffect } from 'react'
import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
let _AsyncStorage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } | null = null
try { _AsyncStorage = require('@react-native-async-storage/async-storage').default } catch {}
import { useAuthStore } from '../stores/authStore'
import { usePlan, PLAN_NAMES, PLAN_COLORS } from '../hooks/usePlan'
import { supabase } from '../lib/supabase'
import StepperInput from '../components/ui/StepperInput'
import i18n, { changeAppLanguage } from '../lib/i18n'
import { CURRENCIES, getSavedCurrency, saveUserCurrency, type SupportedCurrency } from '../lib/currencies'
import { usePreferencesStore } from '../stores/preferencesStore'

type InvestorType = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'SPECULATIVE'
type InvestGoal   = 'RETIREMENT' | 'WEALTH' | 'INCOME' | 'EDUCATION' | 'EMERGENCY' | 'OTHER'
type TimeHorizon  = 'SHORT' | 'MEDIUM' | 'LONG'

const INVESTOR_TYPES: { key: InvestorType; label: string; color: string }[] = [
  { key: 'CONSERVATIVE', label: 'Conservador',  color: '#22c55e' },
  { key: 'MODERATE',     label: 'Moderado',     color: '#3b82f6' },
  { key: 'AGGRESSIVE',   label: 'Agressivo',    color: '#f59e0b' },
  { key: 'SPECULATIVE',  label: 'Especulativo', color: '#ef4444' },
]

const GOALS: { key: InvestGoal; label: string; icon: string }[] = [
  { key: 'RETIREMENT', label: 'Reforma',     icon: '🏖️' },
  { key: 'WEALTH',     label: 'Riqueza',     icon: '💎' },
  { key: 'INCOME',     label: 'Rendimento',  icon: '💰' },
  { key: 'EDUCATION',  label: 'Educação',    icon: '🎓' },
  { key: 'EMERGENCY',  label: 'Emergência',  icon: '🛡️' },
  { key: 'OTHER',      label: 'Outro',       icon: '✨' },
]

const HORIZONS: { key: TimeHorizon; label: string; sub: string }[] = [
  { key: 'SHORT',  label: 'Curto',  sub: '< 3 anos' },
  { key: 'MEDIUM', label: 'Médio',  sub: '3–7 anos' },
  { key: 'LONG',   label: 'Longo',  sub: '> 7 anos' },
]

const LANGUAGES = [
  { code: 'pt' as const, label: 'Português', flag: '🇵🇹' },
  { code: 'en' as const, label: 'English',   flag: '🇬🇧' },
  { code: 'es' as const, label: 'Español',   flag: '🇪🇸' },
]

const COUNTRIES = [
  { code: 'PT', label: 'Portugal 🇵🇹' },
  { code: 'ES', label: 'España 🇪🇸' },
  { code: 'GB', label: 'United Kingdom 🇬🇧' },
  { code: 'US', label: 'United States 🇺🇸' },
  { code: 'CH', label: 'Switzerland 🇨🇭' },
  { code: 'AO', label: 'Angola 🇦🇴' },
  { code: 'BR', label: 'Brasil 🇧🇷' },
]

const COUNTRY_KEY = '@deskmint_user_country'

// ── Ecrã ────────────────────────────────────────────────────────────────────

export default function DefinicoesScreen() {
  const profile    = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const plan       = usePlan()

  const [needs,         setNeeds]         = useState(profile?.target_needs   ?? 50)
  const [wants,         setWants]         = useState(profile?.target_wants   ?? 30)
  const [savings,       setSavings]       = useState(profile?.target_savings ?? 20)
  const [investorType,  setInvestorType]  = useState<InvestorType | null>((profile?.investor_type as InvestorType) ?? null)
  const [investGoal,    setInvestGoal]    = useState<InvestGoal   | null>((profile?.invest_goal   as InvestGoal)   ?? null)
  const [timeHorizon,   setTimeHorizon]   = useState<TimeHorizon  | null>((profile?.time_horizon  as TimeHorizon)  ?? null)
  const [monthlyInvest, setMonthlyInvest] = useState<string>(
    profile?.monthly_invest != null ? String(profile.monthly_invest) : ''
  )
  const [saving,        setSaving]        = useState(false)
  const [success,       setSuccess]       = useState(false)
  const [currentLang,   setCurrentLang]   = useState<'pt' | 'en' | 'es'>('pt')
  const [currency,      setCurrencyLocal] = useState<SupportedCurrency>('EUR')
  const [country,       setCountry]       = useState('PT')

  const setCurrencyStore = usePreferencesStore((s) => s.setCurrency)

  useEffect(() => {
    // Supabase profile é a fonte de verdade cross-device; AsyncStorage é o fallback offline
    const profileLang = (profile as any)?.language as 'pt' | 'en' | 'es' | undefined
    const profileCurrency = (profile as any)?.currency as SupportedCurrency | undefined
    if (profileLang) {
      changeAppLanguage(profileLang)
      setCurrentLang(profileLang)
    } else {
      setCurrentLang((i18n.language as 'pt' | 'en' | 'es') || 'pt')
    }
    if (profileCurrency) {
      saveUserCurrency(profileCurrency)
      setCurrencyLocal(profileCurrency)
      setCurrencyStore(profileCurrency)
    } else {
      getSavedCurrency().then((c) => { setCurrencyLocal(c); setCurrencyStore(c) })
    }
    _AsyncStorage?.getItem(COUNTRY_KEY).then((c) => { if (c) setCountry(c) })
  }, [])

  async function handleLangChange(lang: 'pt' | 'en' | 'es') {
    await changeAppLanguage(lang)
    setCurrentLang(lang)
    if (profile) {
      supabase.from('dm_profiles').update({ language: lang }).eq('id', profile.id)
    }
  }

  async function handleCurrencyChange(c: SupportedCurrency) {
    await saveUserCurrency(c)
    setCurrencyLocal(c)
    setCurrencyStore(c)
    if (profile) {
      supabase.from('dm_profiles').update({ currency: c }).eq('id', profile.id)
    }
  }

  async function handleCountryChange(code: string) {
    if (_AsyncStorage) await _AsyncStorage.setItem(COUNTRY_KEY, code)
    setCountry(code)
  }

  const soma    = needs + wants + savings
  const somaOk  = soma === 100
  const planColor = PLAN_COLORS[plan.plan as keyof typeof PLAN_COLORS] ?? '#64748b'
  const planName  = PLAN_NAMES[plan.plan  as keyof typeof PLAN_NAMES]  ?? plan.plan

  async function guardar() {
    if (!somaOk || !profile) return
    setSaving(true)
    const { data, error } = await supabase
      .from('dm_profiles')
      .update({
        target_needs:   needs,
        target_wants:   wants,
        target_savings: savings,
        investor_type:  investorType,
        invest_goal:    investGoal,
        time_horizon:   timeHorizon,
        monthly_invest: monthlyInvest.length > 0
          ? Number(monthlyInvest.replace(',', '.'))
          : null,
      })
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

        {/* ── Perfil de Investidor ─────────────────────────────────── */}
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', padding: 20 }}>
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
            Perfil de Investidor
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
            Usado para personalizar recomendações e metas
          </Text>

          {/* Tipo de investidor */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>Tipo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {INVESTOR_TYPES.map((t) => {
              const active = investorType === t.key
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setInvestorType(t.key)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? t.color : '#334155',
                    backgroundColor: active ? t.color + '18' : 'transparent',
                  }}
                >
                  {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.color }} />}
                  <Text style={{ color: active ? t.color : '#64748b', fontSize: 12, fontWeight: active ? '700' : '500' }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Objetivo */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>Objetivo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {GOALS.map((g) => {
              const active = investGoal === g.key
              return (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => setInvestGoal(g.key)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 12, paddingVertical: 7,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? '#14b8a6' : '#334155',
                    backgroundColor: active ? '#14b8a618' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{g.icon}</Text>
                  <Text style={{ color: active ? '#14b8a6' : '#64748b', fontSize: 12, fontWeight: active ? '700' : '500' }}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Horizonte temporal */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>Horizonte Temporal</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {HORIZONS.map((h) => {
              const active = timeHorizon === h.key
              return (
                <TouchableOpacity
                  key={h.key}
                  onPress={() => setTimeHorizon(h.key)}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 10,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? '#8b5cf6' : '#334155',
                    backgroundColor: active ? '#8b5cf618' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? '#8b5cf6' : '#64748b', fontSize: 12, fontWeight: active ? '700' : '500' }}>
                    {h.label}
                  </Text>
                  <Text style={{ color: active ? '#8b5cf680' : '#475569', fontSize: 10, marginTop: 2 }}>
                    {h.sub}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Aporte Mensal */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8, marginTop: 18 }}>
            Aporte Mensal
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#0f172a', borderRadius: 10,
            borderWidth: 1.5, borderColor: '#334155',
            paddingHorizontal: 14, paddingVertical: 10,
          }}>
            <Text style={{ color: '#475569', fontSize: 16, fontWeight: '600', marginRight: 6 }}>€</Text>
            <TextInput
              value={monthlyInvest}
              onChangeText={(t) => setMonthlyInvest(t.replace(/[^0-9,.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#475569"
              style={{ color: '#f8fafc', fontSize: 16, fontWeight: '600', flex: 1 }}
            />
          </View>
          <Text style={{ color: '#475569', fontSize: 11, marginTop: 5 }}>
            Valor que planeias investir mensalmente
          </Text>
        </View>

        {/* ── Regra Orçamental ─────────────────────────────────────── */}
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', padding: 20 }}>
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>
            Regra Orçamental
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>
            Define como distribuir o teu rendimento mensal
          </Text>

          <StepperInput label="Necessidades" value={needs}   step={5} min={5} max={90} suffix="%" onChange={setNeeds}   layout="horizontal" dotColor="#f59e0b" valueColor="#f59e0b" controlHeight={42} />
          <View style={{ height: 1, backgroundColor: '#0f172a' }} />
          <StepperInput label="Lazer"        value={wants}   step={5} min={5} max={90} suffix="%" onChange={setWants}   layout="horizontal" dotColor="#8b5cf6" valueColor="#8b5cf6" controlHeight={42} />
          <View style={{ height: 1, backgroundColor: '#0f172a' }} />
          <StepperInput label="Poupança"     value={savings} step={5} min={5} max={90} suffix="%" onChange={setSavings} layout="horizontal" dotColor="#2dd4bf"                       controlHeight={42} />

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

        {/* ── Língua & Moeda ─────────────────────────────────────────── */}
        <View style={{ backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', padding: 20 }}>
          <Text style={{ color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
            Língua & Moeda
          </Text>

          {/* Idioma */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>Idioma</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
            {LANGUAGES.map((l) => {
              const active = currentLang === l.code
              return (
                <TouchableOpacity
                  key={l.code}
                  onPress={() => handleLangChange(l.code)}
                  activeOpacity={0.75}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 10,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? '#14b8a6' : '#334155',
                    backgroundColor: active ? '#14b8a618' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 18, marginBottom: 2 }}>{l.flag}</Text>
                  <Text style={{ color: active ? '#14b8a6' : '#64748b', fontSize: 11, fontWeight: active ? '700' : '500' }}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Moeda */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>Moeda Principal</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {Object.values(CURRENCIES).map((c) => {
              const active = currency === c.code
              return (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => handleCurrencyChange(c.code)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? '#f59e0b' : '#334155',
                    backgroundColor: active ? '#f59e0b18' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? '#f59e0b' : '#475569', fontSize: 13, fontWeight: '700' }}>
                    {c.symbol}
                  </Text>
                  <Text style={{ color: active ? '#f59e0b' : '#64748b', fontSize: 12, fontWeight: active ? '700' : '500' }}>
                    {c.code}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* País */}
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>País de Residência</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {COUNTRIES.map((c) => {
              const active = country === c.code
              return (
                <TouchableOpacity
                  key={c.code}
                  onPress={() => handleCountryChange(c.code)}
                  activeOpacity={0.75}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8,
                    borderRadius: 10, borderWidth: 1.5,
                    borderColor: active ? '#8b5cf6' : '#334155',
                    backgroundColor: active ? '#8b5cf618' : 'transparent',
                  }}
                >
                  <Text style={{ color: active ? '#8b5cf6' : '#64748b', fontSize: 12, fontWeight: active ? '700' : '500' }}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

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
