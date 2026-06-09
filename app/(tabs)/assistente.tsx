import Header from '../../components/ui/Header'
import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

type Message = { role: 'user' | 'assistant'; text: string }

const QUICK_ACTIONS = [
  { label: 'Analisa a minha carteira', icon: 'pie-chart-outline' },
  { label: 'Notícias de hoje', icon: 'newspaper-outline' },
  { label: 'Como está a minha diversificação?', icon: 'git-network-outline' },
  { label: 'Quanto investi no total?', icon: 'cash-outline' },
]

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

export default function AssistenteScreen() {
  const session = useAuthStore((s) => s.session)
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<object[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  async function send(text: string) {
    if (!text.trim() || loading || !session) return

    const userMsg: Message = { role: 'user', text: text.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/investment-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: text.trim(), history }),
        }
      )

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')

      setMessages((prev) => [...prev, { role: 'assistant', text: json.reply }])
      setHistory(json.updatedHistory)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Erro: ${msg}` },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  function clearChat() {
    setMessages([])
    setHistory([])
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header title="Assistente IA" />

      {/* Botão limpar */}
      {messages.length > 0 && (
        <TouchableOpacity
          onPress={clearChat}
          className="absolute top-14 right-4 z-10 p-2"
        >
          <Ionicons name="trash-outline" size={18} color="#64748b" />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Estado vazio */}
          {messages.length === 0 && (
            <View className="items-center mt-8 mb-6">
              <View className="w-16 h-16 rounded-full bg-teal-500/10 items-center justify-center mb-4">
                <Ionicons name="sparkles" size={28} color="#14b8a6" />
              </View>
              <Text className="text-dark-200 text-lg font-semibold mb-1">
                Assistente de Investimentos
              </Text>
              <Text className="text-dark-400 text-sm text-center px-6">
                Pergunta-me sobre a tua carteira, diversificação ou notícias dos teus ativos.
              </Text>

              {/* Ações rápidas */}
              <View className="mt-6 w-full gap-2">
                {QUICK_ACTIONS.map((a) => (
                  <TouchableOpacity
                    key={a.label}
                    onPress={() => send(a.label)}
                    className="flex-row items-center gap-3 bg-dark-800 border border-dark-600 rounded-xl px-4 py-3"
                  >
                    <Ionicons name={a.icon as 'pie-chart-outline'} size={16} color="#14b8a6" />
                    <Text className="text-dark-300 text-sm">{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Mensagens */}
          {messages.map((m, i) => (
            <View
              key={i}
              className={`mb-3 max-w-[88%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}
            >
              {m.role === 'assistant' && (
                <View className="flex-row items-center gap-1 mb-1">
                  <Ionicons name="sparkles" size={12} color="#14b8a6" />
                  <Text className="text-teal-400 text-xs font-medium">Assistente</Text>
                </View>
              )}
              <View
                className={
                  m.role === 'user'
                    ? 'bg-teal-600 rounded-2xl rounded-tr-sm px-4 py-3'
                    : 'bg-dark-800 border border-dark-600 rounded-2xl rounded-tl-sm px-4 py-3'
                }
              >
                <Text
                  className={
                    m.role === 'user' ? 'text-dark-50 text-sm' : 'text-dark-200 text-sm leading-5'
                  }
                >
                  {m.text}
                </Text>
              </View>
            </View>
          ))}

          {/* Indicador de loading */}
          {loading && (
            <View className="self-start mb-3 bg-dark-800 border border-dark-600 rounded-2xl rounded-tl-sm px-4 py-3">
              <ActivityIndicator size="small" color="#14b8a6" />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="px-4 pb-2 pt-2 border-t border-dark-600 bg-dark-900">
          <View className="flex-row items-end gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              placeholder="Escreve uma pergunta..."
              placeholderTextColor="#475569"
              multiline
              returnKeyType="send"
              className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3 text-dark-200 text-sm max-h-28"
              style={{ textAlignVertical: 'top' }}
            />
            <TouchableOpacity
              onPress={() => send(input)}
              disabled={!input.trim() || loading}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                input.trim() && !loading ? 'bg-teal-500' : 'bg-dark-700'
              }`}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={input.trim() && !loading ? '#fff' : '#475569'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
