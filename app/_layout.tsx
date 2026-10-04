import '../global.css'
import '../lib/i18n'
import '../lib/sentry'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Stack, router } from 'expo-router'
import * as Sentry from '@sentry/react-native'
import ErrorBoundary from '../components/ErrorBoundary'

// NativeWind web: forçar dark mode via classe em vez de media query
if (typeof (StyleSheet as any).setFlag === 'function') {
  ;(StyleSheet as any).setFlag('darkMode', 'class')
}
import { QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { getSavedCurrency, saveUserCurrency, type SupportedCurrency } from '../lib/currencies'
import { getSavedTickerBarEnabled } from '../lib/tickerBarPref'
import { usePreferencesStore } from '../stores/preferencesStore'
import { changeAppLanguage } from '../lib/i18n'

function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    // ── Preferências locais ───────────────────────────────────────────────
    getSavedCurrency().then((c) => usePreferencesStore.getState().setCurrency(c))
    getSavedTickerBarEnabled().then((v) => usePreferencesStore.getState().setTickerBarEnabled(v))

    // ── Sessão inicial ────────────────────────────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      Sentry.setUser(session ? { id: session.user.id } : null)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        router.replace('/(auth)/login')
      }
    })

    // ── Mudanças de auth ──────────────────────────────────────────────────
    // Só se encaminha nos eventos que significam "acabaste de entrar". Antes, todos
    // os eventos com sessão chamavam fetchProfile → router.replace('/(tabs)'),
    // incluindo TOKEN_REFRESHED (renovação do token, ~de hora a hora e ao voltar à
    // app) e USER_UPDATED — que atirariam a pessoa para a Dashboard a meio do que
    // estivesse a fazer, ou a meio de escolher uma password nova.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      Sentry.setUser(session ? { id: session.user.id } : null)
      const { recovering, setRecovering } = useAuthStore.getState()

      if (!session) {
        setRecovering(false)
        setProfile(null)
        queryClient.clear()
        router.replace('/(auth)/login')
        return
      }

      switch (event) {
        case 'PASSWORD_RECOVERY':
          // Sessão de recuperação (verifyOtp type 'recovery'): fica no ecrã da
          // password nova. O ecrã já ligou a flag antes do verifyOtp; isto confirma.
          setRecovering(true)
          return
        case 'USER_UPDATED':
          // Fim da recuperação: a password foi mudada. Fora disso, não encaminha.
          if (recovering) {
            setRecovering(false)
            fetchProfile(session.user.id)
          }
          return
        case 'SIGNED_IN':
          // Um login normal limpa sempre a flag. A recuperação nunca emite SIGNED_IN
          // (verificado no auth-js 2.106.1), por isso isto é uma rede de segurança:
          // uma flag esquecida a true não bloqueia o login seguinte.
          setRecovering(false)
          fetchProfile(session.user.id)
          return
        case 'INITIAL_SESSION':
          // No arranque a flag é sempre false (não persistida). Quem fechar a app a
          // meio de uma recuperação entra na Dashboard — decisão consciente.
          if (!recovering) fetchProfile(session.user.id)
          return
        default:
          // TOKEN_REFRESHED, MFA...: só atualiza a sessão.
          return
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Único ponto de decisão de routing para utilizadores autenticados
  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('dm_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      // Sincroniza preferências de idioma e moeda do perfil Supabase
      const lang = (data as any).language as 'pt' | 'en' | 'es' | undefined
      const curr = (data as any).currency as SupportedCurrency | undefined
      if (lang) changeAppLanguage(lang)
      if (curr) {
        saveUserCurrency(curr)
        usePreferencesStore.getState().setCurrency(curr)
      }
      router.replace(data.onboarding_done ? '/(tabs)' : '/(auth)/onboarding' as any)
    } else {
      router.replace('/(auth)/onboarding' as any)
    }
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notificacoes" options={{ presentation: 'card' }} />
          <Stack.Screen name="definicoes"  options={{ presentation: 'card' }} />
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default Sentry.wrap(RootLayout)
