import '../global.css'
import '../lib/i18n'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Stack, router } from 'expo-router'

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
import { usePreferencesStore } from '../stores/preferencesStore'
import { changeAppLanguage } from '../lib/i18n'

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession)
  const setProfile = useAuthStore((s) => s.setProfile)
  const setLoading = useAuthStore((s) => s.setLoading)

  useEffect(() => {
    // ── Preferências locais ───────────────────────────────────────────────
    getSavedCurrency().then((c) => usePreferencesStore.getState().setCurrency(c))

    // ── Sessão inicial ────────────────────────────────────────────────────
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        router.replace('/(auth)/login')
      }
    })

    // ── Mudanças de auth (login / logout / refresh de token) ──────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        queryClient.clear()
        router.replace('/(auth)/login')
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
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notificacoes" options={{ presentation: 'card' }} />
        <Stack.Screen name="definicoes"  options={{ presentation: 'card' }} />
      </Stack>
    </QueryClientProvider>
  )
}
