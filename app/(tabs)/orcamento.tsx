import Header from '../../components/ui/Header'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ScrollView, View, Text, ActivityIndicator,
  TouchableOpacity, TextInput, RefreshControl, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useExpenses } from '../../hooks/useExpenses'
import { useIncome } from '../../hooks/useIncome'
import { useDashboardStore } from '../../stores/dashboardStore'
import NovaDespesaModal from '../../components/budget/NovaDespesaModal'

type ExpenseItem = {
  id: string
  description: string
  amount: number
  dm_expense_categories?: { name: string } | null
}

type ExpenseRowProps = {
  e: ExpenseItem
  editMode: boolean
  isEditing: boolean
  deletingId: string | null
  onStartEdit: (id: string) => void
  onSaveEdit: (id: string, description: string, amount: number) => void
  onCancelEdit: () => void
  onDelete: (id: string) => void
}

const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

function ExpenseRow({
  e, editMode, isEditing, deletingId,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: ExpenseRowProps) {
  const [localDesc, setLocalDesc] = useState(e.description)
  const [localAmt, setLocalAmt] = useState(String(e.amount))

  // Só repõe o texto local quando entra em modo de edição — nunca enquanto
  // o utilizador escreve, para um refetch em segundo plano não apagar o que está a escrever.
  useEffect(() => {
    if (isEditing) {
      setLocalDesc(e.description)
      setLocalAmt(String(e.amount))
    }
  }, [isEditing])

  function handleTrashPress() {
    Alert.alert(
      'Eliminar despesa',
      `Tens a certeza que queres eliminar "${e.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(e.id) },
      ]
    )
  }

  const isPendingDelete = deletingId === e.id

  if (isEditing) {
    return (
      <View className="py-3 border-b border-dark-700">
        <TextInput
          className="bg-dark-700 rounded-lg px-3 py-2 text-sm mb-2 border border-dark-600"
          style={{ color: '#0f172a' }}
          value={localDesc}
          onChangeText={setLocalDesc}
          placeholder="Descrição"
          placeholderTextColor="#94a3b8"
          autoFocus
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
        />
        <View className="flex-row gap-2">
          <TextInput
            className="bg-dark-700 rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
            style={{ color: '#0f172a' }}
            value={localAmt}
            onChangeText={setLocalAmt}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
          />
          <TouchableOpacity
            className="bg-mint-600 rounded-lg px-4 items-center justify-center"
            onPress={() => {
              const val = parseFloat(localAmt.replace(',', '.'))
              if (!isNaN(val) && val > 0) {
                onSaveEdit(e.id, localDesc.trim() || e.description, val)
              }
            }}
          >
            <Ionicons name="checkmark" size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-dark-700 rounded-lg px-3 items-center justify-center"
            onPress={onCancelEdit}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
      <View className="flex-1 mr-2">
        <Text className="text-dark-200 text-sm">{e.description}</Text>
        {e.dm_expense_categories && (
          <Text className="text-dark-500 text-xs">{e.dm_expense_categories.name}</Text>
        )}
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="text-dark-50 text-sm font-medium">{fmt(e.amount)}</Text>
        <View className="flex-row gap-3 items-center">
          {editMode && (
            <TouchableOpacity
              onPress={() => onStartEdit(e.id)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="pencil-outline" size={17} color="#94a3b8" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleTrashPress}
            disabled={isPendingDelete}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {isPendingDelete
              ? <ActivityIndicator size="small" color="#f87171" />
              : <Ionicons name="trash-outline" size={17} color="#f87171" />
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function OrcamentoScreen() {
  const { selectedMonth: MONTH, selectedYear: YEAR } = useDashboardStore()
  const qc = useQueryClient()
  const { data, isLoading, isFetching, update, remove } = useExpenses(MONTH, YEAR)
  const { data: income, upsert: upsertIncome } = useIncome(MONTH, YEAR)

  // Ref estável para o remove.mutate — evita closures stale no Alert callback
  const removeRef = useRef(remove.mutate)
  useEffect(() => { removeRef.current = remove.mutate }, [remove.mutate])

  const [showModal, setShowModal]         = useState(false)
  const [editMode, setEditMode]           = useState(false)
  const [editingSalary, setEditingSalary] = useState(false)
  const [salaryInput, setSalaryInput]     = useState('')
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)

  function startEditSalary() {
    setSalaryInput(String(income?.total_net ?? data?.totalIncome ?? ''))
    setEditingSalary(true)
  }

  async function saveSalary() {
    const val = parseFloat(salaryInput.replace(',', '.'))
    if (!isNaN(val) && val > 0) await upsertIncome.mutateAsync(val)
    setEditingSalary(false)
  }

  async function handleSaveEdit(id: string, description: string, amount: number) {
    await update.mutateAsync({ id, description, amount })
    setEditingId(null)
  }

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id)
    removeRef.current(id, {
      onSettled: () => setDeletingId(null),
    })
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header />
      <NovaDespesaModal visible={showModal} onClose={() => setShowModal(false)} month={MONTH} year={YEAR} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => qc.invalidateQueries({ queryKey: ['expenses'] })}
            tintColor="#14b8a6"
          />
        }
      >

        {/* Cabeçalho */}
        <View className="mt-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-dark-400 text-sm capitalize">
              {new Date(YEAR, MONTH - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
            </Text>
            <Text className="text-dark-50 text-2xl font-bold">Orçamento</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`rounded-xl px-3 py-2 border flex-row items-center gap-1 ${editMode ? 'border-mint-600 bg-mint-900' : 'border-dark-600 bg-dark-800'}`}
              onPress={() => { setEditMode(!editMode); setEditingId(null) }}
            >
              <Ionicons name={editMode ? 'checkmark-done-outline' : 'create-outline'} size={15} color={editMode ? '#14b8a6' : '#94a3b8'} />
              <Text className={`text-xs font-medium ${editMode ? 'text-mint-400' : 'text-dark-400'}`}>
                {editMode ? 'Concluir' : 'Editar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-mint-600 rounded-xl px-3 py-2 flex-row items-center gap-1"
              onPress={() => setShowModal(true)}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-dark-50 font-medium text-xs">Nova</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? <ActivityIndicator color="#14b8a6" className="mt-20" /> : (
          <>
            {/* Balanço */}
            <View className="bg-mint-100 border border-mint-300 rounded-2xl p-4 mb-4">
              <Text className="text-mint-700 text-xs mb-1">Rendimento Líquido</Text>
              {editingSalary ? (
                <View className="flex-row gap-2 items-center">
                  <TextInput
                    className="bg-dark-800 rounded-xl px-4 py-3 text-xl font-bold flex-1 border border-dark-600"
                    style={{ color: '#0f172a' }}
                    value={salaryInput}
                    onChangeText={setSalaryInput}
                    keyboardType="decimal-pad"
                    autoFocus
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                  />
                  <TouchableOpacity className="bg-mint-600 rounded-xl px-4 py-3" onPress={saveSalary}>
                    <Ionicons name="checkmark" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={editMode ? startEditSalary : undefined}
                >
                  <Text className="text-dark-50 text-3xl font-bold">{fmt(data?.totalIncome ?? 0)}</Text>
                  {editMode && <Ionicons name="pencil-outline" size={16} color="#0f766e" />}
                </TouchableOpacity>
              )}
              <View className="flex-row justify-between mt-3">
                <View>
                  <Text className="text-dark-300 text-xs">Despesas</Text>
                  <Text className="text-red-500 font-semibold">{fmt((data?.totalFixed ?? 0) + (data?.totalVariable ?? 0))}</Text>
                </View>
                <View>
                  <Text className="text-dark-300 text-xs">Poupança</Text>
                  <Text className="text-mint-700 font-semibold">{fmt(data?.totalSavings ?? 0)}</Text>
                </View>
                <View>
                  <Text className="text-dark-300 text-xs">Disponível</Text>
                  <Text className="text-dark-50 font-semibold">
                    {fmt((data?.totalIncome ?? 0) - (data?.totalFixed ?? 0) - (data?.totalVariable ?? 0) - (data?.totalSavings ?? 0))}
                  </Text>
                </View>
              </View>
            </View>

            {/* Despesas fixas */}
            {(data?.fixed?.length ?? 0) > 0 && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-dark-50 font-semibold">Despesas Fixas</Text>
                  <Text className="text-red-400 font-semibold">{fmt(data!.totalFixed)}</Text>
                </View>
                {data!.fixed.map((e: any) => (
                  <ExpenseRow
                    key={e.id}
                    e={e}
                    editMode={editMode}
                    isEditing={editingId === e.id}
                    deletingId={deletingId}
                    onStartEdit={setEditingId}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}

            {/* Variáveis */}
            {(data?.variable?.length ?? 0) > 0 && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-dark-50 font-semibold">Despesas Variáveis</Text>
                  <Text className="text-red-400 font-semibold">{fmt(data!.totalVariable)}</Text>
                </View>
                {data!.variable.map((e: any) => (
                  <ExpenseRow
                    key={e.id}
                    e={e}
                    editMode={editMode}
                    isEditing={editingId === e.id}
                    deletingId={deletingId}
                    onStartEdit={setEditingId}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={handleDelete}
                  />
                ))}
              </View>
            )}

            {/* Poupança */}
            {(data?.savings?.length ?? 0) > 0 && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-8">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-dark-50 font-semibold">Poupança & Investimento</Text>
                  <Text className="text-mint-400 font-semibold">{fmt(data!.totalSavings)}</Text>
                </View>
                {data!.savings.map((e: any) => (
                  <ExpenseRow
                    key={e.id}
                    e={e}
                    editMode={editMode}
                    isEditing={editingId === e.id}
                    deletingId={deletingId}
                    onStartEdit={setEditingId}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingId(null)}
                    onDelete={handleDelete}
                  />
                ))}
                <Text className="text-dark-400 text-xs mt-3">
                  Taxa de poupança: {data!.totalIncome > 0 ? ((data!.totalSavings / data!.totalIncome) * 100).toFixed(1) : 0}%
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
