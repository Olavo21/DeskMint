import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

// Recuperação de password por código de 6 dígitos (resetPasswordForEmail →
// verifyOtp type 'recovery' → updateUser). Não usa deep link nem Site URL.
// O routing do fim é do _layout: o updateUser emite USER_UPDATED antes de devolver,
// e o _layout, vendo `recovering` ligado, limpa-o e encaminha. Ver AGENTS.md.

const RESEND_COOLDOWN_S = 60 // igual ao intervalo mínimo por utilizador do Supabase
const MAX_CODE_ATTEMPTS = 8  // generoso: um código novo gasta um dos 2 emails/hora do projeto

type Step = 'email' | 'code'

// Erros de envio. Não usar o friendlyError do login: diz "aguarda um minuto", e o
// limite de email do Supabase é por hora (2 emails/h para o projeto inteiro).
function sendErrorKey(e: AuthError): { key: string; s?: number } {
  const wait = /after (\d+) seconds?/i.exec(e.message)
  if (wait) return { key: 'recovery.errEmailInterval', s: Number(wait[1]) }
  if (e.code === 'over_email_send_rate_limit' || e.status === 429) return { key: 'recovery.errEmailRateLimit' }
  if (e.code === 'email_address_invalid') return { key: 'recovery.errEmailInvalid' }
  return { key: 'recovery.errSend' }
}

export default function RecuperarScreen() {
  const { t } = useTranslation()
  const setRecovering = useAuthStore((s) => s.setRecovering)

  const [step, setStep]               = useState<Step>('email')
  const [email, setEmail]             = useState('')
  const [code, setCode]               = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sending, setSending]         = useState(false)
  // Liga-se no início da submissão e, no caminho feliz, nunca volta a false: o botão
  // fica bloqueado até o _layout navegar (o fetchProfile é assíncrono e o ecrã ainda
  // está montado nesse intervalo). Só um erro o reativa.
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [info, setInfo]               = useState<string | null>(null)
  const [cooldown, setCooldown]       = useState(0)
  const [attempts, setAttempts]       = useState(0)
  // true depois de um verifyOtp bem-sucedido: o código fica gasto, por isso uma nova
  // tentativa (ex.: password rejeitada) só repete o updateUser.
  const verified = useRef(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const normalizedEmail = email.trim().toLowerCase()

  async function sendCode() {
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) { setError(t('recovery.errEmailInvalid')); return }
    setSending(true); setError(null)
    const { error: e } = await supabase.auth.resetPasswordForEmail(normalizedEmail)
    setSending(false)
    if (e) {
      const { key, s } = sendErrorKey(e)
      setError(t(key, { s }))
      if (s) setCooldown(s)
      return
    }
    // Mesma mensagem exista ou não a conta: não revela se o email está registado.
    setInfo(t('recovery.codeSent'))
    setCode('')
    setStep('code')
    setAttempts(0)
    setCooldown(RESEND_COOLDOWN_S)
  }

  async function submit() {
    if (!/^\d{6}$/.test(code)) { setError(t('recovery.errCodeFormat')); return }
    if (password.length < 6)   { setError(t('recovery.errPasswordShort')); return }
    if (password !== confirm)  { setError(t('recovery.errPasswordMismatch')); return }
    if (attempts >= MAX_CODE_ATTEMPTS && !verified.current) { setError(t('recovery.errTooManyAttempts')); return }

    setSubmitting(true); setError(null)

    if (!verified.current) {
      // Ligar ANTES do verifyOtp: o _layout não pode encaminhar a sessão de recuperação.
      setRecovering(true)
      const { error: e } = await supabase.auth.verifyOtp({ email: normalizedEmail, token: code, type: 'recovery' })
      if (e) {
        setRecovering(false)
        setSubmitting(false)
        const next = attempts + 1
        setAttempts(next)
        if (e.code === 'over_request_rate_limit' || e.status === 429) setError(t('recovery.errVerifyRateLimit'))
        else if (next >= MAX_CODE_ATTEMPTS) setError(t('recovery.errTooManyAttempts'))
        else setError(t('recovery.errInvalidCode'))
        return
      }
      verified.current = true
    }

    // Nunca limpar a flag antes desta chamada: o encaminhamento final depende de ela
    // estar ligada quando o USER_UPDATED chega. No sucesso não se toca em estado.
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) {
      setSubmitting(false)
      if (e.code === 'same_password') setError(t('recovery.errSamePassword'))
      else if (e.code === 'weak_password') setError(t('recovery.errWeakPassword'))
      else setError(t('recovery.errUpdate'))
    }
  }

  async function cancel() {
    setRecovering(false)
    // Fecha uma eventual sessão de recuperação já criada pelo verifyOtp.
    if (verified.current) await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const inputClass = 'bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700'
  const canResend = cooldown <= 0 && !sending && !submitting && !verified.current

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
            {t('recovery.title')}
          </Text>

          {step === 'email' ? (
            <View className="gap-4">
              <Text className="text-dark-400 text-sm">{t('recovery.emailHint')}</Text>
              <View>
                <Text className="text-dark-400 text-xs mb-1.5 ml-1">{t('recovery.emailLabel')}</Text>
                <TextInput
                  className={inputClass}
                  style={{ color: '#1e293b' }}
                  placeholder={t('recovery.emailLabel')}
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              {error && <ErrorBox text={error} />}
              <PrimaryButton
                label={cooldown > 0 ? t('recovery.resendIn', { s: cooldown }) : t('recovery.sendCode')}
                onPress={sendCode}
                loading={sending}
                disabled={sending || cooldown > 0}
              />
            </View>
          ) : (
            <View className="gap-4">
              {info && (
                <View className="rounded-xl px-4 py-3 border bg-blue-50 border-blue-200">
                  <Text className="text-sm text-blue-700">{info}</Text>
                </View>
              )}
              <View>
                <Text className="text-dark-400 text-xs mb-1.5 ml-1">{t('recovery.codeLabel')}</Text>
                <TextInput
                  className={inputClass}
                  style={{ color: '#1e293b', letterSpacing: 6, fontSize: 20 }}
                  placeholder="000000"
                  placeholderTextColor="#94a3b8"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  editable={!verified.current && !submitting}
                />
              </View>
              <PasswordField
                label={t('recovery.newPasswordLabel')}
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                toggleLabel={showPassword ? t('recovery.hidePassword') : t('recovery.showPassword')}
              />
              <PasswordField
                label={t('recovery.confirmPasswordLabel')}
                value={confirm}
                onChange={setConfirm}
                visible={showPassword}
              />
              {error && <ErrorBox text={error} />}
              <PrimaryButton label={t('recovery.save')} onPress={submit} loading={submitting} disabled={submitting} />
              <TouchableOpacity onPress={sendCode} disabled={!canResend} style={{ alignItems: 'center', paddingVertical: 6, opacity: canResend ? 1 : 0.5 }}>
                <Text style={{ color: '#0d9488', fontWeight: '600' }}>
                  {cooldown > 0 ? t('recovery.resendIn', { s: cooldown }) : t('recovery.resend')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={cancel} disabled={submitting} style={{ alignItems: 'center', paddingVertical: 14, marginTop: 8 }}>
            <Text className="text-dark-300 font-medium text-base">{t('recovery.cancel')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ErrorBox({ text }: { text: string }) {
  return (
    <View className="rounded-xl px-4 py-3 border bg-red-50 border-red-200">
      <Text className="text-sm text-red-600">{text}</Text>
    </View>
  )
}

function PrimaryButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading: boolean; disabled: boolean }) {
  return (
    <TouchableOpacity
      className="bg-mint-600 rounded-xl py-4 items-center mt-2"
      onPress={onPress}
      disabled={disabled}
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">{label}</Text>}
    </TouchableOpacity>
  )
}

function PasswordField({ label, value, onChange, visible, onToggle, toggleLabel }: {
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle?: () => void
  toggleLabel?: string
}) {
  return (
    <View>
      <Text className="text-dark-400 text-xs mb-1.5 ml-1">{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
          style={{ color: '#1e293b', paddingRight: onToggle ? 48 : 16 }}
          placeholder={label}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete="password-new"
          textContentType="newPassword"
        />
        {onToggle && (
          <TouchableOpacity
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ position: 'absolute', right: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
