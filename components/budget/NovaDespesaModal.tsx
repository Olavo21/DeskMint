import { useState } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Switch, Platform, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '../ui/CrossDateTimePicker'
import { Ionicons } from '@expo/vector-icons'
import { useExpenses } from '../../hooks/useExpenses'
import { useExpenseCategories } from '../../hooks/useExpenseCategories'
import { useRecurringExpenses } from '../../hooks/useRecurringExpenses'
import { useCredits } from '../../hooks/useCredits'
import type { DmCredit, DmExpenseCategory } from '../../types/database'

interface Props {
  visible: boolean
  onClose: () => void
  month: number
  year: number
}

const TYPE_COLORS = {
  NEEDS:   { bg: '#1e3a5f', border: '#2563eb', text: '#93c5fd', label: 'Necessidade' },
  WANTS:   { bg: '#3b1f5e', border: '#7c3aed', text: '#c4b5fd', label: 'Desejo' },
  SAVINGS: { bg: '#14332a', border: '#16a34a', text: '#86efac', label: 'Poupança' },
}

const CREDIT_KIND_LABEL: Record<string, string> = {
  VEHICLE: 'Veículo',
  HOUSING: 'Habitação',
}

const getToday = () => new Date()

function fmt(d: Date) {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export default function NovaDespesaModal({ visible, onClose, month, year }: Props) {
  const { create } = useExpenses(month, year)
  const { data: categories = [], isLoading: loadingCats } = useExpenseCategories()
  const { create: createRecurring } = useRecurringExpenses()
  const { data: credits = [] } = useCredits()

  const [categoryId, setCategoryId]       = useState<string | null>(null)
  const [description, setDescription]     = useState('')
  const [amount, setAmount]               = useState('')
  const [isFixed, setIsFixed]             = useState(true)
  const [isRecurring, setIsRecurring]     = useState(false)
  const [diaVencimento, setDiaVencimento] = useState(1)
  const [paidAt, setPaidAt]               = useState<Date | null>(getToday)
  const [showPicker, setShowPicker]       = useState(false)
  const [showCreditPicker, setShowCreditPicker] = useState(false)
  const [errors, setErrors]               = useState<Record<string, string>>({})

  const selectedCat = categories.find((c) => c.id === categoryId) as DmExpenseCategory | undefined

  function importCredit(credit: DmCredit) {
    setDescription(credit.name)
    setAmount(credit.monthly_payment.toFixed(2).replace('.', ','))
    setShowCreditPicker(false)
    setErrors((e) => ({ ...e, description: '', amount: '' }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!categoryId)                       e.category = 'Selecciona uma categoria'
    if (!description.trim())               e.description = 'Descrição obrigatória'
    const val = Number(amount.replace(',', '.'))
    if (!amount || isNaN(val) || val <= 0) e.amount = 'Valor inválido'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})

    await create.mutateAsync({
      category_id: categoryId!,
      description:  description.trim(),
      amount:       Number(amount.replace(',', '.')),
      is_fixed:     isFixed,
      month,
      year,
      paid_at: paidAt?.toISOString() ?? null,
    })

    if (isRecurring) {
      await createRecurring.mutateAsync({
        category_id:    categoryId!,
        description:    description.trim(),
        amount:         Number(amount.replace(',', '.')),
        is_fixed:       isFixed,
        dia_vencimento: diaVencimento,
      })
    }

    handleClose()
  }

  function handleClose() {
    setCategoryId(null); setDescription(''); setAmount('')
    setIsFixed(true); setIsRecurring(false); setDiaVencimento(1)
    setPaidAt(getToday()); setErrors({}); setShowCreditPicker(false)
    onClose()
  }

  const grouped = (['NEEDS', 'WANTS', 'SAVINGS'] as const).map((type) => ({
    type,
    items: categories.filter((c) => c.type === type),
  })).filter((g) => g.items.length > 0)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-dark-900">

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-dark-300 text-base">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-dark-50 text-base font-semibold">Nova Despesa</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={create.isPending}>
            {create.isPending
              ? <ActivityIndicator color="#14b8a6" size="small" />
              : <Text className="text-mint-800 text-base font-semibold">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">

          {/* Selector de categoria */}
          <Text className="text-dark-300 text-xs mb-2 ml-1">Categoria *</Text>
          {errors.category && (
            <Text className="text-red-700 text-xs mb-2 ml-1">{errors.category}</Text>
          )}

          {loadingCats ? (
            <ActivityIndicator color="#14b8a6" className="my-4" />
          ) : (
            grouped.map(({ type, items }) => {
              const cfg = TYPE_COLORS[type]
              return (
                <View key={type} className="mb-3">
                  <Text className="text-dark-300 text-xs mb-2 uppercase tracking-wider">{cfg.label}s</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {items.map((cat) => {
                      const selected = categoryId === cat.id
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => { setCategoryId(cat.id); setErrors((e) => ({ ...e, category: '' })) }}
                          className="flex-row items-center gap-1.5 rounded-xl px-3 py-2 border"
                          style={{
                            backgroundColor: selected ? cfg.bg : '#1e293b',
                            borderColor: selected ? cfg.border : '#334155',
                          }}
                        >
                          {cat.icon ? <Text>{cat.icon}</Text> : null}
                          <Text style={{ color: selected ? cfg.text : '#94a3b8' }} className="text-sm font-medium">
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              )
            })
          )}

          <View className="h-px bg-dark-700 my-4" />

          {/* Importar de Crédito */}
          {credits.length > 0 && (
            <View className="mb-4">
              <TouchableOpacity
                onPress={() => setShowCreditPicker((v) => !v)}
                className="flex-row items-center gap-2 self-start"
              >
                <Ionicons
                  name={showCreditPicker ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#0d9488"
                />
                <Text style={{ color: '#0d9488', fontSize: 13, fontWeight: '500' }}>
                  Importar de Crédito
                </Text>
              </TouchableOpacity>

              {showCreditPicker && (
                <View
                  className="mt-2 rounded-xl border border-dark-700 overflow-hidden"
                  style={{ backgroundColor: '#0f1f2e' }}
                >
                  {credits.map((credit, idx) => (
                    <TouchableOpacity
                      key={credit.id}
                      onPress={() => importCredit(credit)}
                      className="flex-row items-center justify-between px-4 py-3"
                      style={{
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: '#1e293b',
                      }}
                    >
                      <View className="flex-1 mr-3">
                        <Text className="text-dark-50 text-sm font-medium">{credit.name}</Text>
                        <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>
                          {CREDIT_KIND_LABEL[credit.kind] ?? credit.kind}
                        </Text>
                      </View>
                      <Text style={{ color: '#0d9488', fontWeight: '600', fontSize: 13 }}>
                        {credit.monthly_payment.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Descrição */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Descrição *</Text>
            <TextInput
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#0f172a' }}
              placeholder="ex: Supermercado Continente"
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
            />
            {errors.description && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.description}</Text>}
          </View>

          {/* Valor */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Valor (€) *</Text>
            <TextInput
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#0f172a' }}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
            />
            {errors.amount && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.amount}</Text>}
          </View>

          {/* Fixo / Variável */}
          {selectedCat && selectedCat.type !== 'SAVINGS' && (
            <View className="bg-dark-800 rounded-xl px-4 py-3 mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-dark-50 text-sm font-medium">Despesa fixa mensal</Text>
                <Text className="text-dark-400 text-xs mt-0.5">
                  {isFixed ? 'Repete todos os meses' : 'Pontual / única'}
                </Text>
              </View>
              <Switch
                value={isFixed}
                onValueChange={setIsFixed}
                trackColor={{ false: '#334155', true: '#0d9488' }}
                thumbColor="white"
              />
            </View>
          )}

          {/* Repetir todos os meses */}
          <View className="bg-dark-800 rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-dark-50 text-sm font-medium">Repetir todos os meses</Text>
              <Text className="text-dark-400 text-xs mt-0.5">
                Cria automaticamente esta despesa em todos os meses seguintes
              </Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: '#334155', true: '#0d9488' }}
              thumbColor="white"
            />
          </View>

          {/* Dia de vencimento (só quando isRecurring) */}
          {isRecurring && (
            <View className="mb-4">
              <Text className="text-dark-300 text-xs mb-2 ml-1">Dia de vencimento</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ paddingRight: 4, gap: 6 }}
              >
                {DAYS.map((d) => {
                  const selected = diaVencimento === d
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setDiaVencimento(d)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? '#0d9488' : '#1e293b',
                        borderWidth: 1,
                        borderColor: selected ? '#0d9488' : '#334155',
                      }}
                    >
                      <Text style={{
                        color: selected ? '#fff' : '#64748b',
                        fontSize: 13,
                        fontWeight: selected ? '700' : '400',
                      }}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
              <Text style={{ color: '#475569', fontSize: 11, marginTop: 6, marginLeft: 4 }}>
                Dia {diaVencimento} de cada mês
              </Text>
            </View>
          )}

          {/* Data de pagamento */}
          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Pago a</Text>
            <View className="flex-row gap-2">
              <Pressable
                className="flex-1 bg-dark-800 rounded-xl px-4 py-3.5 border border-dark-700 flex-row items-center justify-between"
                onPress={() => setShowPicker(true)}
              >
                <Text className={paidAt ? 'text-dark-50 text-base' : 'text-dark-400 text-base'}>
                  {paidAt ? fmt(paidAt) : 'Por pagar'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#475569" />
              </Pressable>
              {paidAt && (
                <TouchableOpacity
                  className="bg-dark-800 rounded-xl px-3 border border-dark-700 items-center justify-center"
                  onPress={() => setPaidAt(null)}
                >
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {showPicker && (
            <DateTimePicker
              value={paidAt ?? getToday()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setPaidAt(d) }}
              maximumDate={getToday()}
              locale="pt-PT"
            />
          )}

          {/* Mês/Ano destino */}
          <View className="bg-dark-800 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-2">
            <Ionicons name="calendar-outline" size={16} color="#475569" />
            <Text className="text-dark-400 text-sm">
              A registar em{' '}
              <Text className="font-medium" style={{ color: '#0f172a' }}>
                {new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </Text>
            </Text>
          </View>

          {create.isError && (
            <View className="bg-red-100 border border-red-300 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-800 text-sm">Erro ao guardar. Tenta novamente.</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-mint-700 rounded-xl py-4 items-center mb-8"
            onPress={handleSubmit}
            disabled={create.isPending}
          >
            {create.isPending
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">Guardar Despesa</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
