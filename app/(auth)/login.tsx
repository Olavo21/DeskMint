import { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require('../../assets/logo.png')

function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials'))       return 'Email ou password incorretos.'
  if (msg.includes('Email not confirmed'))             return 'Confirma o teu email antes de entrar. Verifica a caixa de entrada.'
  if (msg.includes('only request this after'))        return 'Demasiadas tentativas. Aguarda um minuto e tenta novamente.'
  if (msg.includes('rate limit'))                     return 'Demasiadas tentativas. Aguarda um minuto e tenta novamente.'
  if (msg.includes('User already registered'))        return 'Este email já está registado. Tenta entrar diretamente.'
  if (msg.includes('Password should be at least'))    return 'A password deve ter pelo menos 6 caracteres.'
  return msg
}

export default function LoginScreen() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const cooldownTimer           = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastAttempt             = useRef(0)

  function startCooldown(seconds: number) {
    setCooldown(seconds)
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownTimer.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function checkCooldown(): boolean {
    const elapsed = (Date.now() - lastAttempt.current) / 1000
    if (elapsed < 60 && lastAttempt.current > 0 && cooldown > 0) {
      setError(`Aguarda ${cooldown}s antes de tentar novamente.`)
      return false
    }
    return true
  }

  async function handleSignIn() {
    if (!email || !password) { setError('Preenche o email e a password.'); return }
    if (!checkCooldown()) return
    setLoading(true); setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(friendlyError(authError.message))
      if (authError.message.includes('only request this after') || authError.message.includes('rate limit')) {
        lastAttempt.current = Date.now()
        startCooldown(60)
      }
    }
    setLoading(false)
  }

  async function handleSignUp() {
    if (!email || !password) { setError('Preenche o email e a password.'); return }
    if (password.length < 6)  { setError('A password deve ter pelo menos 6 caracteres.'); return }
    if (!checkCooldown()) return
    setLoading(true); setError(null)
    lastAttempt.current = Date.now()
    const { error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      setError(friendlyError(authError.message))
      if (authError.message.includes('only request this after') || authError.message.includes('rate limit')) {
        startCooldown(60)
      }
    } else {
      setError(null)
      // Supabase enviou email de confirmação — mostrar aviso
      setError('📧 Verifica o teu email e clica no link de confirmação.')
    }
    setLoading(false)
  }

  const isDisabled = loading || cooldown > 0

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
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#1e293b' }}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
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
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#1e293b' }}
              placeholder="Palavra-passe"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error && (
            <View className={`rounded-xl px-4 py-3 border ${error.startsWith('📧') ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <Text className={`text-sm ${error.startsWith('📧') ? 'text-blue-700' : 'text-red-600'}`}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-mint-600 rounded-xl py-4 items-center mt-2"
            onPress={handleSignIn}
            disabled={isDisabled}
            style={{ opacity: isDisabled ? 0.6 : 1 }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">
                  {cooldown > 0 ? `Aguarda ${cooldown}s` : 'Entrar'}
                </Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            className="border border-dark-600 rounded-xl py-4 items-center mt-2"
            onPress={handleSignUp}
            disabled={isDisabled}
            style={{ opacity: isDisabled ? 0.6 : 1 }}
          >
            <Text className="text-dark-300 font-medium text-base">Criar conta</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-dark-500 text-xs text-center mt-8">
          DeskMint · Versão Founders
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
