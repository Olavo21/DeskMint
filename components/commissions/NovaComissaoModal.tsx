import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform, Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useCommissions } from '../../hooks/useCommissions'
import { useCommissionTypes } from '../../hooks/useCommissionTypes'
import type { DmCommission } from '../../types/database'

interface Props {
  visible: boolean
  onClose: () => void
  editing?: DmCommission | null
}

const TODAY = new Date()

function fmt(d: Date) {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <View className="mb-4">
      <Text className="text-dark-400 text-xs mb-1.5 ml-1">{label}</Text>
      {children}
      {error ? <Text className="text-red-400 text-xs mt-1 ml-1">{error}</Text> : null}
    </View>
  )
}

export default function NovaComissaoModal({ visible, onClose, editing = null }: Props) {
  const { create, update } = useCommissions()
  const { data: types = [] } = useCommissionTypes()
  const isEditing = !!editing

  const [typeId, setTypeId]           = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [client, setClient]           = useState('')
  const [amount, setAmount]           = useState('')
  const [notes, setNotes]             = useState('')
  const [earnedAt, setEarnedAt]       = useState(TODAY)
  const [expectedAt, setExpectedAt]   = useState<Date | null>(null)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  // controlo de date pickers (Android abre um dialog, iOS usa inline)
  const [showEarned, setShowEarned]     = useState(false)
  const [showExpected, setShowExpected] = useState(false)

  // Pré-preenche os campos só quando o modal abre em modo edição —
  // nunca enquanto o utilizador escreve, para um refetch não apagar o que está a escrever.
  useEffect(() => {
    if (visible && editing) {
      setTypeId(editing.type_id ?? null)
      setDescription(editing.description)
      setClient(editing.client ?? '')
      setAmount(String(editing.amount))
      setNotes(editing.notes ?? '')
      setEarnedAt(new Date(editing.earned_at))
      setExpectedAt(editing.expected_at ? new Date(editing.expected_at) : null)
    }
  }, [visible, editing])

  function validate() {
    const e: Record<string, string> = {}
    if (!description.trim())        e.description = 'Descrição obrigatória'
    if (!amount || isNaN(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0)
                                    e.amount = 'Valor inválido'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})

    if (isEditing) {
      await update.mutateAsync({
        id:          editing!.id,
        description: description.trim(),
        client:      client.trim() || null,
        amount:      Number(amount.replace(',', '.')),
        earnedAt:    earnedAt.toISOString(),
        expectedAt:  expectedAt?.toISOString() ?? null,
        notes:       notes.trim() || null,
        typeId,
      })
    } else {
      await create.mutateAsync({
        description:  description.trim(),
        client:       client.trim() || null,
        amount:       Number(amount.replace(',', '.')),
        status:       'PENDING',
        earned_at:    earnedAt.toISOString(),
        expected_at:  expectedAt?.toISOString() ?? null,
        notes:        notes.trim() || null,
        type_id:      typeId,
      })
    }
    handleClose()
  }

  function handleClose() {
    setTypeId(null); setDescription(''); setClient(''); setAmount(''); setNotes('')
    setEarnedAt(TODAY); setExpectedAt(null); setErrors({})
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-dark-900">

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-dark-700">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-dark-400 text-base">Cancelar</Text>
          </TouchableOpacity>
          <Text className="text-white text-base font-semibold">{isEditing ? 'Editar Comissão' : 'Nova Comissão'}</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={create.isPending || update.isPending}>
            {(create.isPending || update.isPending)
              ? <ActivityIndicator color="#14b8a6" size="small" />
              : <Text className="text-mint-400 text-base font-semibold">Guardar</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-6" keyboardShouldPersistTaps="handled">

          {/* Tipo de serviço */}
          {types.length > 0 && (
            <Field label="Tipo de serviço">
              <View className="flex-row flex-wrap gap-2">
                {types.map((t) => {
                  const selected = typeId === t.id
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setTypeId(selected ? null : t.id)}
                      className="flex-row items-center gap-1.5 rounded-xl px-3 py-2 border"
                      style={{
                        backgroundColor: selected ? t.color + '33' : '#1e293b',
                        borderColor: selected ? t.color : '#334155',
                      }}
                    >
                      {t.icon ? <Text>{t.icon}</Text> : null}
                      <Text style={{ color: selected ? t.color : '#94a3b8' }} className="text-sm font-medium">
                        {t.name}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </Field>
          )}

          {/* Descrição */}
          <Field label="Descrição *" error={errors.description}>
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="ex: Venda contrato Janeiro"
              placeholderTextColor="#475569"
              value={description}
              onChangeText={setDescription}
            />
          </Field>

          {/* Cliente */}
          <Field label="Cliente / Fonte">
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="Nome do cliente (opcional)"
              placeholderTextColor="#475569"
              value={client}
              onChangeText={setClient}
            />
          </Field>

          {/* Valor */}
          <Field label="Valor (€) *" error={errors.amount}>
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-3.5 text-base border border-dark-700"
              placeholder="0.00"
              placeholderTextColor="#475569"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </Field>

          {/* Datas */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-dark-400 text-xs mb-1.5 ml-1">Data gerada *</Text>
              <Pressable
                className="bg-dark-800 rounded-xl px-4 py-3.5 border border-dark-700 flex-row items-center justify-between"
                onPress={() => setShowEarned(true)}
              >
                <Text className="text-white text-base">{fmt(earnedAt)}</Text>
                <Ionicons name="calendar-outline" size={16} color="#475569" />
              </Pressable>
            </View>
            <View className="flex-1">
              <Text className="text-dark-400 text-xs mb-1.5 ml-1">Pagamento previsto</Text>
              <Pressable
                className="bg-dark-800 rounded-xl px-4 py-3.5 border border-dark-700 flex-row items-center justify-between"
                onPress={() => setShowExpected(true)}
              >
                <Text className={expectedAt ? 'text-white text-base' : 'text-dark-600 text-base'}>
                  {expectedAt ? fmt(expectedAt) : 'Opcional'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color="#475569" />
              </Pressable>
            </View>
          </View>

          {/* Date pickers */}
          {showEarned && (
            <DateTimePicker
              value={earnedAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowEarned(Platform.OS === 'ios'); if (d) setEarnedAt(d) }}
              maximumDate={TODAY}
              locale="pt-PT"
            />
          )}
          {showExpected && (
            <DateTimePicker
              value={expectedAt ?? TODAY}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => { setShowExpected(Platform.OS === 'ios'); if (d) setExpectedAt(d) }}
              minimumDate={earnedAt}
              locale="pt-PT"
            />
          )}

          {/* Notas */}
          <Field label="Notas">
            <TextInput
              className="bg-dark-800 text-white rounded-xl px-4 py-3 text-base border border-dark-700"
              placeholder="Observações (opcional)"
              placeholderTextColor="#475569"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{ minHeight: 80 }}
            />
          </Field>

          {/* Erro de submit */}
          {(create.isError || update.isError) && (
            <View className="bg-red-900/50 border border-red-700 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-sm">Erro ao guardar. Tenta novamente.</Text>
            </View>
          )}

          {/* Botão principal (alternativa ao header) */}
          <TouchableOpacity
            className="bg-mint-600 rounded-xl py-4 items-center mt-2 mb-8"
            onPress={handleSubmit}
            disabled={create.isPending || update.isPending}
          >
            {(create.isPending || update.isPending)
              ? <ActivityIndicator color="white" />
              : <Text className="text-white font-semibold text-base">{isEditing ? 'Guardar Alterações' : 'Guardar Comissão'}</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}
