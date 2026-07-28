import Header from '../../components/ui/Header'
import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'

type Message = { role: 'user' | 'assistant'; text: string }

const QUICK_ACTIONS = [
  { key: 'invested',    icon: 'wallet-outline'      },
  { key: 'performers',  icon: 'trending-up-outline'  },
  { key: 'allocation',  icon: 'pie-chart-outline'    },
  { key: 'projection',  icon: 'rocket-outline'       },
  { key: 'tax',         icon: 'receipt-outline'      },
  { key: 'goal',        icon: 'calculator-outline'   },
] as const

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!

// ─── Inline markdown renderer ────────────────────────────────────────────────

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: '700', color: '#f1f5f9' }}>
              {part.slice(2, -2)}
            </Text>
          )
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text
              key={i}
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                color: '#2dd4bf',
                backgroundColor: '#0f172a',
                borderRadius: 3,
              }}
            >
              {part.slice(1, -1)}
            </Text>
          )
        }
        return <Text key={i}>{part}</Text>
      })}
    </>
  )
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')

  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return (
            <Text
              key={i}
              style={{
                color: '#f1f5f9',
                fontSize: 15,
                fontWeight: '700',
                marginTop: 6,
                marginBottom: 2,
              }}
            >
              {line.slice(4)}
            </Text>
          )
        }

        if (line.startsWith('## ')) {
          return (
            <Text
              key={i}
              style={{ color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginTop: 8 }}
            >
              {line.slice(3)}
            </Text>
          )
        }

        if (line.startsWith('> ')) {
          return (
            <View
              key={i}
              style={{
                borderLeftWidth: 2,
                borderLeftColor: '#14b8a6',
                paddingLeft: 10,
                marginVertical: 4,
              }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', lineHeight: 19 }}>
                <InlineText text={line.slice(2)} />
              </Text>
            </View>
          )
        }

        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: 6, marginLeft: 2 }}>
              <Text style={{ color: '#2dd4bf', fontSize: 13, lineHeight: 20 }}>•</Text>
              <Text style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 20, flex: 1 }}>
                <InlineText text={line.slice(2)} />
              </Text>
            </View>
          )
        }

        if (line.trim() === '') {
          return <View key={i} style={{ height: 4 }} />
        }

        return (
          <Text key={i} style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 20 }}>
            <InlineText text={line} />
          </Text>
        )
      })}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AssistenteScreen() {
  const session   = useAuthStore((s) => s.session)
  const { t }     = useTranslation()
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
          {/* Empty state */}
          {messages.length === 0 && (
            <View className="items-center mt-8 mb-6">
              <View className="w-16 h-16 rounded-full bg-teal-500/10 items-center justify-center mb-4">
                <Ionicons name="sparkles" size={28} color="#14b8a6" />
              </View>
              <Text className="text-dark-200 text-lg font-semibold mb-1">
                {t('assistant.title')}
              </Text>
              <Text className="text-dark-400 text-sm text-center px-6">
                {t('assistant.subtitle')}
              </Text>

              <View className="mt-6 w-full gap-2">
                {QUICK_ACTIONS.map((a) => {
                  const label = t(`assistant.quickQuestions.${a.key}`)
                  return (
                    <TouchableOpacity
                      key={a.key}
                      onPress={() => send(label)}
                      className="flex-row items-center gap-3 bg-dark-800 border border-dark-600 rounded-xl px-4 py-3"
                    >
                      <Ionicons name={a.icon as 'wallet-outline'} size={16} color="#14b8a6" />
                      <Text className="text-dark-300 text-sm flex-1">{label}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#334155" />
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <View
              key={i}
              className={`mb-3 max-w-[92%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}
            >
              {m.role === 'assistant' && (
                <View className="flex-row items-center gap-1 mb-1">
                  <Ionicons name="sparkles" size={12} color="#14b8a6" />
                  <Text className="text-teal-400 text-xs font-medium">{t('assistant.label')}</Text>
                </View>
              )}
              <View
                className={
                  m.role === 'user'
                    ? 'bg-teal-600 rounded-2xl rounded-tr-sm px-4 py-3'
                    : 'bg-dark-800 border border-dark-600 rounded-2xl rounded-tl-sm px-4 py-3'
                }
              >
                {m.role === 'user' ? (
                  <Text className="text-dark-50 text-sm">{m.text}</Text>
                ) : (
                  <MarkdownText text={m.text} />
                )}
              </View>
            </View>
          ))}

          {/* Loading indicator */}
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
              placeholder={t('assistant.inputPlaceholder')}
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
