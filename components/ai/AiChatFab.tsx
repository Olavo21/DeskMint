import { useState, useRef, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAiChat } from '../../hooks/useAiChat'

// Sugestões rápidas para o estado vazio
const QUICK = [
  { label: 'Atualiza o VWCE -1.5%',      icon: 'trending-down-outline' },
  { label: 'Registar despesa de 30€ combustível', icon: 'car-outline' },
  { label: 'Mover comissão do João para Paga',    icon: 'checkmark-circle-outline' },
  { label: 'Nova comissão 500€ empresa X',         icon: 'add-circle-outline' },
]

export default function AiChatFab() {
  const insets = useSafeAreaInsets()
  const { messages, isLoading, send, clearChat } = useAiChat()
  const [open, setOpen]   = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  // Animação de pulse no FAB quando inativo
  const pulseAnim = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    )
    if (!open) pulse.start()
    else { pulse.stop(); pulseAnim.setValue(1) }
    return () => pulse.stop()
  }, [open])

  function handleSend() {
    if (!input.trim()) return
    send(input)
    setInput('')
  }

  function close() {
    setOpen(false)
  }

  // Scroll automático para o fim ao receber nova mensagem
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
    }
  }, [messages.length])

  return (
    <>
      {/* ── FAB ── */}
      {!open && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            bottom: 80 + insets.bottom,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={() => setOpen(true)}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#0f766e',
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 9,
                shadowColor: '#14b8a6',
                shadowOpacity: 0.45,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              <Ionicons name="sparkles" size={16} color="#ccfbef" />
              <Text style={{ color: '#ccfbef', fontSize: 13, fontWeight: '700' }}>
                Assistente
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ── Modal (Bottom Sheet) ── */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
        statusBarTranslucent
      >
        {/* Overlay escura — toca para fechar */}
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }}
          onPress={close}
        >
          {/* Sheet — stopPropagation para não fechar ao tocar dentro */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '68%',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={0}
            >
              {/* Cabeçalho */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: '#f0fdfa',
                      borderWidth: 1, borderColor: '#99f6e4',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="sparkles" size={16} color="#0d9488" />
                  </View>
                  <View>
                    <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 14 }}>
                      Assistente IA
                    </Text>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                      Acções rápidas · DeskMint
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {messages.length > 0 && (
                    <TouchableOpacity
                      onPress={clearChat}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={17} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={close} hitSlop={8} style={{ padding: 4 }}>
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mensagens */}
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Estado vazio */}
                {messages.length === 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                      Sugestões rápidas:
                    </Text>
                    {QUICK.map((q) => (
                      <TouchableOpacity
                        key={q.label}
                        onPress={() => send(q.label)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: '#f8faf9',
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                        }}
                      >
                        <Ionicons name={q.icon as 'add-circle-outline'} size={15} color="#0d9488" />
                        <Text style={{ color: '#334155', fontSize: 13, flex: 1 }}>{q.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Lista de mensagens */}
                {messages.map((m) => (
                  <View
                    key={m.id}
                    style={{
                      marginBottom: 10,
                      maxWidth: '88%',
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {m.role === 'assistant' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <Ionicons name="sparkles" size={11} color="#0d9488" />
                        <Text style={{ color: '#0d9488', fontSize: 11, fontWeight: '600' }}>
                          {m.isAction ? 'Acção executada' : 'Assistente'}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        borderRadius: 16,
                        borderTopRightRadius: m.role === 'user' ? 4 : 16,
                        borderTopLeftRadius:  m.role === 'user' ? 16 : 4,
                        paddingHorizontal: 13,
                        paddingVertical: 9,
                        backgroundColor:
                          m.role === 'user'
                            ? '#0d9488'
                            : m.isAction
                            ? '#f0fdfa'
                            : '#f1f5f9',
                        borderWidth: m.isAction ? 1 : 0,
                        borderColor: m.isAction ? '#99f6e4' : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          color: m.role === 'user' ? '#ffffff' : '#1e293b',
                          fontSize: 13,
                          lineHeight: 19,
                        }}
                      >
                        {m.text}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Loading */}
                {isLoading && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: '#f1f5f9',
                      borderRadius: 16,
                      borderTopLeftRadius: 4,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <ActivityIndicator size="small" color="#0d9488" />
                  </View>
                )}
              </ScrollView>

              {/* Input */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: '#e2e8f0',
                  backgroundColor: '#ffffff',
                  paddingBottom: 10 + insets.bottom,
                }}
              >
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={handleSend}
                  placeholder="Diz-me o que queres fazer..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  returnKeyType="send"
                  style={{
                    flex: 1,
                    backgroundColor: '#f8faf9',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingTop: 10,
                    paddingBottom: 10,
                    color: '#1e293b',
                    fontSize: 13,
                    maxHeight: 100,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={!input.trim() || isLoading}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: input.trim() && !isLoading ? '#0d9488' : '#e2e8f0',
                  }}
                >
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={input.trim() && !isLoading ? '#ffffff' : '#94a3b8'}
                  />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
