import '../global.css'
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

export default function RootLayout() {
  const { setSession, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    // sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      setLoading(false)
      router.replace(session ? '/(tabs)' : '/(auth)/login')
    })

    // ouvir mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
        router.replace('/(tabs)')
      } else {
        setProfile(null)
        queryClient.clear()
        router.replace('/(auth)/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('dm_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      // novo utilizador sem onboarding → redirecionar
      if (!data.onboarding_done) {
        router.replace('/(auth)/onboarding' as any)
      }
    } else {
      // perfil não existe → novo utilizador
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
      </Stack>
    </QueryClientProvider>
  )
}
