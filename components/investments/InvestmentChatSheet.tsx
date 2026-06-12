import { useState, useRef, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useInvestmentChat, type InvestMessage } from '../../hooks/useInvestmentChat'
import { usePortfolio } from '../../hooks/usePortfolio'

const QUICK_ACTIONS = [
  { label: 'VWCE subiu 1,5% hoje',              icon: 'trending-up-outline'        },
  { label: 'IS3R caiu 0,8%',                    icon: 'trending-down-outline'      },
  { label: 'Comprei 200 € de VWCE',             icon: 'add-circle-outline'         },
  { label: 'Analisa a minha diversificação',    icon: 'pie-chart-outline'          },
] as const

interface Props {
  visible: boolean
  onClose: () => void
}

export default function InvestmentChatSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const { messages, isLoading, send, clearChat } = useInvestmentChat()
  const { data: portfolio } = usePortfolio()
  const [input, setInput] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }, [messages.length])

  function handleSend() {
    if (!input.trim()) return
    send(input.trim())
    setInput('')
  }

  const fmt = (n: number) =>
    n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const plPos = (portfolio?.totalPL ?? 0) >= 0

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay — tap to close */}
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
        onPress={onClose}
      >
        {/* Sheet — stop propagation */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '72%',
            backgroundColor: '#080f1e',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: 'hidden',
            borderTopWidth: 1,
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: '#14b8a620',
          }}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >

            {/* ── Header ── */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
              borderBottomWidth: 1, borderBottomColor: '#1e293b',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: '#0d2137',
                  borderWidth: 1, borderColor: '#14b8a640',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="trending-up" size={17} color="#14b8a6" />
                </View>
                <View>
                  <Text style={{ color: '#f1f5f9', fontWeight: '700', fontSize: 14 }}>
                    Assistente de Portefólio
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 11 }}>
                    Actualizações por linguagem natural · DeskMint
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {messages.length > 0 && (
                  <TouchableOpacity onPress={clearChat} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={17} color="#475569" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Portfolio mini-summary ── */}
            {portfolio != null && (
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                marginHorizontal: 14, marginTop: 10, marginBottom: 2,
                backgroundColor: '#0d2137',
                borderRadius: 12, borderWidth: 1, borderColor: '#1e3a5f',
                paddingHorizontal: 14, paddingVertical: 9,
              }}>
                <View>
                  <Text style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>
                    Portefólio actual
                  </Text>
                  <Text style={{ color: '#f1f5f9', fontWeight: '700', fontSize: 16 }}>
                    {fmt(portfolio.totalValue)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#475569', fontSize: 10, marginBottom: 2 }}>P/L Total</Text>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: plPos ? '#14b8a6' : '#ef4444' }}>
                    {plPos ? '+' : ''}{fmt(portfolio.totalPL)}
                  </Text>
                  <Text style={{ fontSize: 11, color: plPos ? '#0d9488' : '#dc2626' }}>
                    {plPos ? '+' : ''}{(portfolio.totalPLPct * 100).toFixed(2)}%
                  </Text>
                </View>
              </View>
            )}

            {/* ── Messages ── */}
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Empty state — quick action suggestions */}
              {messages.length === 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ color: '#334155', fontSize: 12, marginBottom: 2 }}>
                    Sugestões rápidas:
                  </Text>
                  {QUICK_ACTIONS.map((q) => (
                    <TouchableOpacity
                      key={q.label}
                      onPress={() => send(q.label)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        padding: 11, borderRadius: 12,
                        backgroundColor: '#0d2137',
                        borderWidth: 1, borderColor: '#1e3a5f',
                      }}
                    >
                      <Ionicons name={q.icon} size={15} color="#14b8a6" />
                      <Text style={{ color: '#94a3b8', fontSize: 13, flex: 1 }}>{q.label}</Text>
                      <Ionicons name="arrow-forward" size={12} color="#334155" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Message bubbles */}
              {messages.map((m) => (
                <Bubble key={m.id} message={m} />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <View style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#0d2137',
                  borderRadius: 16, borderTopLeftRadius: 4,
                  padding: 13, marginBottom: 10,
                  borderWidth: 1, borderColor: '#1e3a5f',
                }}>
                  <ActivityIndicator size="small" color="#14b8a6" />
                </View>
              )}
            </ScrollView>

            {/* ── Input bar ── */}
            <View style={{
              flexDirection: 'row', alignItems: 'flex-end', gap: 8,
              paddingHorizontal: 12, paddingTop: 10,
              paddingBottom: 12 + insets.bottom,
              borderTopWidth: 1, borderTopColor: '#1e293b',
              backgroundColor: '#080f1e',
            }}>
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                placeholder="ex: VWCE caiu 2%, comprei 150 € de IS3R…"
                placeholderTextColor="#334155"
                multiline
                returnKeyType="send"
                style={{
                  flex: 1,
                  backgroundColor: '#0d2137',
                  borderWidth: 1,
                  borderColor: input.trim() ? '#14b8a640' : '#1e3a5f',
                  borderRadius: 20,
                  paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10,
                  color: '#e2e8f0', fontSize: 13,
                  maxHeight: 100,
                }}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: input.trim() && !isLoading ? '#14b8a6' : '#1e293b',
                }}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={input.trim() && !isLoading ? '#ffffff' : '#334155'}
                />
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Message bubble ──────────────────────────────────────────────────────────

function Bubble({ message }: { message: InvestMessage }) {
  const isUser = message.role === 'user'
  return (
    <View style={{
      marginBottom: 10,
      maxWidth: '88%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
    }}>
      {!isUser && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
          <Ionicons name="trending-up" size={11} color="#14b8a6" />
          <Text style={{ color: '#14b8a6', fontSize: 11, fontWeight: '600' }}>
            {message.isAction ? 'Portefólio actualizado' : 'Assistente'}
          </Text>
        </View>
      )}
      <View style={{
        borderRadius: 16,
        borderTopRightRadius: isUser ? 4 : 16,
        borderTopLeftRadius:  isUser ? 16 : 4,
        paddingHorizontal: 13,
        paddingVertical: 9,
        backgroundColor: isUser
          ? '#0d9488'
          : message.isAction
          ? '#042f2e'
          : '#1e293b',
        borderWidth: message.isAction ? 1 : 0,
        borderColor: message.isAction ? '#14b8a630' : 'transparent',
      }}>
        <Text style={{
          color: isUser ? '#ffffff' : '#cbd5e1',
          fontSize: 13, lineHeight: 19,
        }}>
          {message.text}
        </Text>
      </View>
    </View>
  )
}
