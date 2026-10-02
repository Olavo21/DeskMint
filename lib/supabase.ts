import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// SecureStore só funciona em iOS/Android — web usa localStorage
const storage = Platform.OS === 'web'
  ? {
      getItem:    (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem:    (key: string, value: string) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
    }
  : {
      getItem:    (key: string) => SecureStore.getItemAsync(key),
      setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // Web: detecta o token no URL hash (#access_token=...) após confirmação de email.
    // Native: false — e NÃO há deep link handling nenhum no repo (zero
    // Linking.addEventListener / getInitialURL / useURL). Um link de email abre
    // a app e o token é simplesmente ignorado. Ver "Recuperação de password"
    // no AGENTS.md antes de assumir que existe código algures a tratar isto.
    detectSessionInUrl: Platform.OS === 'web',
  },
})
