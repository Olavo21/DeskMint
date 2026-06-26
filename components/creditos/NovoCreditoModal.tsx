import { useEffect, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCredits } from '../../hooks/useCredits'
import type { DmCredit } from '../../types/database'

interface Props {
  visible: boolean
  onClose: () => void
  credit?: DmCredit | null
}

const KIND_OPTIONS: { key: DmCredit['kind']; label: string; icon: string }[] = [
  { key: 'VEHICLE', label: 'Automóvel', icon: '🚗' },
  { key: 'HOUSING', label: 'Habitação', icon: '🏠' },
]

const RATE_TYPE_OPTIONS: { key: DmCredit['rate_type']; label: string }[] = [
  { key: 'FIXED',    label: 'Fixa' },
  { key: 'VARIABLE', label: 'Variável (Euribor)' },
]

export default function NovoCreditoModal({ visible, onClose, credit }: Props) {
  const { create, update } = useCredits()
  const isEditing = !!credit

  const [kind, setKind]               = useState<DmCredit['kind']>('HOUSING')
  const [name, setName]               = useState('')
  const [principal, setPrincipal]     = useState('')
  const [monthlyPayment, setMonthlyPayment] = useState('')
  const [interestRate, setInterestRate]     = useState('')
  const [rateType, setRateType]       = useState<DmCredit['rate_type']>('FIXED')
  const [remainingMonths, setRemainingMonths] = useState('')
  const [errors, setErrors]           = useState<Record<string, string>>({})

  useEffect(() => {
    if (!visible) return
    if (credit) {
      setKind(credit.kind)
      setName(credit.name)
      setPrincipal(String(credit.principal_amount))
      setMonthlyPayment(String(credit.monthly_payment))
      setInterestRate(String(credit.interest_rate))
      setRateType(credit.rate_type)
      setRemainingMonths(String(credit.remaining_months_snapshot))
    } else {
      setKind('HOUSING'); setName(''); setPrincipal(''); setMonthlyPayment('')
      setInterestRate(''); setRateType('FIXED'); setRemainingMonths('')
    }
    setErrors({})
  }, [visible, credit])

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nome obrigatório'
    if (!principal || isNaN(Number(principal.replace(',', '.'))) || Number(principal.replace(',', '.')) <= 0)
      e.principal = 'Valor inválido'
    if (!monthlyPayment || isNaN(Number(monthlyPayment.replace(',', '.'))) || Number(monthlyPayment.replace(',', '.')) <= 0)
      e.monthlyPayment = 'Valor inválido'
    if (!interestRate || isNaN(Number(interestRate.replace(',', '.'))) || Number(interestRate.replace(',', '.')) < 0)
      e.interestRate = 'Taxa inválida'
    if (!remainingMonths || isNaN(Number(remainingMonths)) || Number(remainingMonths) < 0)
      e.remainingMonths = 'Nº de meses inválido'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})

    const payload = {
      kind,
      name: name.trim(),
      principal_amount: Number(principal.replace(',', '.')),
      monthly_payment: Number(monthlyPayment.replace(',', '.')),
      interest_rate: Number(interestRate.replace(',', '.')),
      rate_type: rateType,
      remaining_months_snapshot: Number(remainingMonths),
      snapshot_date: new Date().toISOString().slice(0, 10),
    }

    if (isEditing) {
      await update.mutateAsync({ id: credit!.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onClose()
  }

  const isPending = create.isPending || update.isPending

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-dark-900">

        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-dark-300 text-base">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-dark-50 text-base font-semibold">{isEditing ? 'Editar Crédito' : 'Novo Crédito'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={isPending}>
            {isPending
              ? <ActivityIndicator color="#14b8a6" size="small" />
              : <Text className="text-mint-800 text-base font-semibold">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-5" keyboardShouldPersistTaps="handled">

          <Text className="text-dark-300 text-xs mb-2 ml-1">Tipo de Crédito *</Text>
          <View className="flex-row gap-2 mb-4">
            {KIND_OPTIONS.map((opt) => {
              const selected = kind === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setKind(opt.key)}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-3 border"
                  style={{ backgroundColor: selected ? '#14332a' : '#1e293b', borderColor: selected ? '#16a34a' : '#334155' }}
                >
                  <Text>{opt.icon}</Text>
                  <Text style={{ color: selected ? '#86efac' : '#94a3b8' }} className="text-sm font-medium">
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Designação *</Text>
            <TextInput
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#0f172a', minWidth: 0 }}
              placeholder="ex: Crédito Habitação CGD"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
            />
            {errors.name && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.name}</Text>}
          </View>

          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Valor Total Financiado (€) *</Text>
            <TextInput
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#0f172a', minWidth: 0 }}
              placeholder="ex: 150000"
              placeholderTextColor="#94a3b8"
              value={principal}
              onChangeText={setPrincipal}
              keyboardType="decimal-pad"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
            />
            {errors.principal && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.principal}</Text>}
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-dark-300 text-xs mb-1.5 ml-1">Prestação Mensal (€) *</Text>
              <TextInput
                className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
                style={{ color: '#0f172a', minWidth: 0 }}
                placeholder="ex: 650"
                placeholderTextColor="#94a3b8"
                value={monthlyPayment}
                onChangeText={setMonthlyPayment}
                keyboardType="decimal-pad"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
              />
              {errors.monthlyPayment && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.monthlyPayment}</Text>}
            </View>
            <View className="flex-1">
              <Text className="text-dark-300 text-xs mb-1.5 ml-1">Meses Restantes *</Text>
              <TextInput
                className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
                style={{ color: '#0f172a', minWidth: 0 }}
                placeholder="ex: 280"
                placeholderTextColor="#94a3b8"
                value={remainingMonths}
                onChangeText={setRemainingMonths}
                keyboardType="number-pad"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="no"
              />
              {errors.remainingMonths && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.remainingMonths}</Text>}
            </View>
          </View>

          <Text className="text-dark-300 text-xs mb-2 ml-1">Tipo de Taxa</Text>
          <View className="flex-row gap-2 mb-4">
            {RATE_TYPE_OPTIONS.map((opt) => {
              const selected = rateType === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setRateType(opt.key)}
                  className="flex-1 py-2.5 rounded-xl border items-center"
                  style={{ backgroundColor: selected ? '#14332a' : '#1e293b', borderColor: selected ? '#16a34a' : '#334155' }}
                >
                  <Text style={{ color: selected ? '#86efac' : '#94a3b8' }} className="text-sm font-semibold">
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View className="mb-4">
            <Text className="text-dark-300 text-xs mb-1.5 ml-1">Taxa de Juro — TAEG/TAN (%) *</Text>
            <TextInput
              className="bg-dark-800 rounded-xl px-4 py-3.5 text-base border border-dark-700"
              style={{ color: '#0f172a', minWidth: 0 }}
              placeholder="ex: 3.5"
              placeholderTextColor="#94a3b8"
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="decimal-pad"
              autoCorrect={false}
              autoComplete="off"
              importantForAutofill="no"
            />
            {errors.interestRate && <Text className="text-red-700 text-xs mt-1 ml-1">{errors.interestRate}</Text>}
          </View>

          {(create.isError || update.isError) && (
            <View className="bg-red-100 border border-red-300 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-800 text-sm">Erro ao guardar. Tenta novamente.</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-mint-700 rounded-xl py-4 items-center mb-8"
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">{isEditing ? 'Guardar Alterações' : 'Guardar Crédito'}</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
