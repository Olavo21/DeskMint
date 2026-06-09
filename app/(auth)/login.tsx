import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'

// Tenta carregar o logo — se não existir usa o fallback com texto
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require('../../assets/logo.png')


export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    if (!email || !password) { setError('Preenche o email e a password.'); return }
    setLoading(true); setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Preenche o email e a password.'); return }
    if (password.length < 6)  { setError('Password deve ter pelo menos 6 caracteres.'); return }
    setLoading(true); setError(null)
    const { error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) setError(authError.message)
    setLoading(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <KeyboardAvoidingView
        className="flex-1 px-6 justify-center"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View className="mb-12 items-center">
          <Image
            source={logoSource}
            style={{ width: 200, height: 160 }}
            resizeMode="contain"
          />
          <Text className="text-dark-400 text-sm mt-2">Orçamento · Poupança · Investimento</Text>
        </View>

        {/* Formulário */}
        <View className="gap-4">
          <View>
            <Text className="text-dark-400 text-xs mb-1.5 ml-1">Email</Text>
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="Email"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View>
            <Text className="text-dark-400 text-xs mb-1.5 ml-1">Password</Text>
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="Palavra-passe"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error && (
            <View className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3">
              <Text className="text-red-400 text-sm">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-mint-600 rounded-xl py-4 items-center mt-2"
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-dark-600 rounded-xl py-4 items-center mt-2"
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text className="text-dark-300 font-medium text-base">Criar conta</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-dark-600 text-xs text-center mt-8">
          DeskMint · Versão Founders
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
