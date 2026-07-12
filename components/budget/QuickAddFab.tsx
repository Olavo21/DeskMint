import { useState, useRef } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Animated, PanResponder, LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useExpenseCategories } from '../../hooks/useExpenseCategories'
import { useExpenses } from '../../hooks/useExpenses'
import { useIncome } from '../../hooks/useIncome'

const TODAY = new Date()
const THIS_MONTH = TODAY.getMonth() + 1
const THIS_YEAR  = TODAY.getFullYear()

const FAB_SIZE = 56
const MARGIN   = 16
const TAP_SLOP = 6

type Mode = 'expense' | 'income'

export default function QuickAddFab() {
  const insets = useSafeAreaInsets()
  const { data: categories = [] } = useExpenseCategories()
  const { create } = useExpenses(THIS_MONTH, THIS_YEAR)
  const { upsert: upsertIncome } = useIncome(THIS_MONTH, THIS_YEAR)

  const [open, setOpen]           = useState(false)
  const [mode, setMode]           = useState<Mode>('expense')
  const [amount, setAmount]       = useState('')
  const [savingId, setSavingId]   = useState<string | null>(null)
  const [savingIncome, setSavingIncome] = useState(false)

  const bounds      = useRef({ width: 0, height: 0 })
  const initialized = useRef(false)
  const pan         = useRef(new Animated.ValueXY()).current
  const dragDistance = useRef(0)

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max)
  }

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout
    bounds.current = { width, height }
    if (!initialized.current && width > 0 && height > 0) {
      initialized.current = true
      pan.setValue({ x: width - FAB_SIZE - MARGIN, y: height - FAB_SIZE - MARGIN })
    }
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        dragDistance.current = 0
        pan.setOffset({ x: (pan.x as any).__getValue(), y: (pan.y as any).__getValue() })
        pan.setValue({ x: 0, y: 0 })
      },
      onPanResponderMove: (_evt, gesture) => {
        dragDistance.current = Math.abs(gesture.dx) + Math.abs(gesture.dy)
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(_evt, gesture)
      },
      onPanResponderRelease: () => {
        pan.flattenOffset()
        if (dragDistance.current < TAP_SLOP) { setOpen(true); return }
        const { width, height } = bounds.current
        const x = (pan.x as any).__getValue()
        const y = (pan.y as any).__getValue()
        const snapToRight = x + FAB_SIZE / 2 > width / 2
        const targetX = snapToRight ? width - FAB_SIZE - MARGIN : MARGIN
        const targetY = clamp(y, MARGIN, height - FAB_SIZE - MARGIN)
        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false, friction: 7, tension: 60,
        }).start()
      },
    })
  ).current

  const amountVal   = Number(amount.replace(',', '.'))
  const amountValid = !isNaN(amountVal) && amountVal > 0

  function close() {
    setOpen(false)
    setAmount('')
    setSavingId(null)
    setSavingIncome(false)
  }

  async function handlePickCategory(categoryId: string, categoryName: string) {
    if (!amountValid || savingId) return
    setSavingId(categoryId)
    try {
      await create.mutateAsync({
        category_id: categoryId,
        description: categoryName,
        amount:      amountVal,
        is_fixed:    false,
        month:       THIS_MONTH,
        year:        THIS_YEAR,
        paid_at:     TODAY.toISOString(),
      })
      close()
    } catch {
      setSavingId(null)
    }
  }

  async function handleSaveIncome() {
    if (!amountValid || savingIncome) return
    setSavingIncome(true)
    try {
      await upsertIncome.mutateAsync(amountVal)
      close()
    } catch {
      setSavingIncome(false)
    }
  }

  return (
    <>
      <View
        pointerEvents="box-none"
        onLayout={handleLayout}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={{ position: 'absolute', transform: [{ translateX: pan.x }, { translateY: pan.y }] }}
        >
          <View style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#0d9488',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#0d9488', shadowOpacity: 0.45, shadowRadius: 10, elevation: 10,
          }}>
            <Ionicons name="add" size={28} color="white" />
          </View>
        </Animated.View>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={close}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#f8faf9',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              paddingTop: 18, paddingBottom: 18 + insets.bottom,
              paddingHorizontal: 20,
            }}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

              {/* Toggle Despesa / Rendimento */}
              <View style={{
                flexDirection: 'row', backgroundColor: '#f1f5f9',
                borderRadius: 10, padding: 3, marginBottom: 16,
              }}>
                {(['expense', 'income'] as Mode[]).map((m) => {
                  const active = mode === m
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => { setMode(m); setAmount('') }}
                      activeOpacity={0.8}
                      style={{
                        flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                        backgroundColor: active ? '#ffffff' : 'transparent',
                        shadowColor: active ? '#000' : 'transparent',
                        shadowOpacity: 0.06, shadowRadius: 3, elevation: active ? 2 : 0,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#0f172a' : '#94a3b8' }}>
                        {m === 'expense' ? '💸 Despesa' : '💰 Rendimento'}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Prompt */}
              <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>
                {mode === 'expense' ? 'Quanto gastaste?' : 'Qual o teu rendimento líquido?'}
              </Text>

              {/* Input de valor */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Text style={{ color: '#0f172a', fontSize: 32, fontWeight: '700', marginRight: 4 }}>€</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor="#94a3b8"
                  autoFocus
                  style={{ color: '#0f172a', fontSize: 32, fontWeight: '700', minWidth: 80, textAlign: 'center' }}
                />
              </View>

              {/* Modo Despesa — grelha de categorias */}
              {mode === 'expense' && (
                <>
                  <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>
                    {amountValid ? 'Escolhe a categoria' : 'Escreve o valor para continuar'}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, opacity: amountValid ? 1 : 0.4 }}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handlePickCategory(cat.id, cat.name)}
                        disabled={!amountValid || !!savingId}
                        style={{
                          width: '30%', alignItems: 'center', gap: 4,
                          backgroundColor: '#ffffff',
                          borderWidth: 1, borderColor: '#e2e8f0',
                          borderRadius: 14, paddingVertical: 12,
                        }}
                      >
                        {savingId === cat.id
                          ? <ActivityIndicator size="small" color="#0d9488" />
                          : <Text style={{ fontSize: 22 }}>{cat.icon ?? '💸'}</Text>
                        }
                        <Text style={{ color: '#334155', fontSize: 11, textAlign: 'center' }} numberOfLines={1}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Modo Rendimento — botão único */}
              {mode === 'income' && (
                <TouchableOpacity
                  onPress={handleSaveIncome}
                  disabled={!amountValid || savingIncome}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: amountValid ? '#0d9488' : '#e2e8f0',
                    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
                    opacity: amountValid ? 1 : 0.5,
                    shadowColor: '#0d9488',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: amountValid ? 0.25 : 0,
                    shadowRadius: 8, elevation: amountValid ? 4 : 0,
                  }}
                >
                  {savingIncome
                    ? <ActivityIndicator color="white" />
                    : <Text style={{ color: amountValid ? 'white' : '#94a3b8', fontWeight: '700', fontSize: 15 }}>
                        Guardar Rendimento
                      </Text>
                  }
                </TouchableOpacity>
              )}

            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
