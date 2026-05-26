import { useState } from 'react'
import {
  ScrollView, View, Text, ActivityIndicator,
  TouchableOpacity, TextInput, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useExpenses } from '../../hooks/useExpenses'
import { useIncome } from '../../hooks/useIncome'
import NovaDespesaModal from '../../components/budget/NovaDespesaModal'

const MONTH = 5
const YEAR  = 2026

type EditingExpense = { id: string; description: string; amount: string } | null

export default function OrcamentoScreen() {
  const { data, isLoading, update, remove } = useExpenses(MONTH, YEAR)
  const { data: income, upsert: upsertIncome } = useIncome(MONTH, YEAR)

  const [showModal, setShowModal]   = useState(false)
  const [editMode, setEditMode]     = useState(false)
  const [editingSalary, setEditingSalary] = useState(false)
  const [salaryInput, setSalaryInput]     = useState('')
  const [editingExp, setEditingExp] = useState<EditingExpense>(null)

  const fmt = (n: number) => n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })

  function startEditSalary() {
    setSalaryInput(String(income?.total_net ?? data?.totalIncome ?? ''))
    setEditingSalary(true)
  }

  async function saveSalary() {
    const val = parseFloat(salaryInput.replace(',', '.'))
    if (!isNaN(val) && val > 0) await upsertIncome.mutateAsync(val)
    setEditingSalary(false)
  }

  function startEditExp(e: { id: string; description: string; amount: number }) {
    setEditingExp({ id: e.id, description: e.description, amount: String(e.amount) })
  }

  async function saveExp() {
    if (!editingExp) return
    const val = parseFloat(editingExp.amount.replace(',', '.'))
    if (!isNaN(val) && val > 0) {
      await update.mutateAsync({ id: editingExp.id, description: editingExp.description, amount: val })
    }
    setEditingExp(null)
  }

  function confirmDelete(id: string, desc: string) {
    Alert.alert('Eliminar despesa', `Tens a certeza que queres eliminar "${desc}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(id) },
    ])
  }

  function ExpenseRow({ e }: { e: { id: string; description: string; amount: number; dm_expense_categories?: { name: string } | null } }) {
    const isEditing = editingExp?.id === e.id
    if (isEditing) {
      return (
        <View className="py-3 border-b border-dark-700">
          <TextInput
            className="bg-dark-700 text-white rounded-lg px-3 py-2 text-sm mb-2 border border-dark-600"
            value={editingExp!.description}
            onChangeText={(v) => setEditingExp((prev) => prev ? { ...prev, description: v } : prev)}
            placeholder="Descrição"
            placeholderTextColor="#475569"
          />
          <View className="flex-row gap-2">
            <TextInput
              className="bg-dark-700 text-white rounded-lg px-3 py-2 text-sm flex-1 border border-dark-600"
              value={editingExp!.amount}
              onChangeText={(v) => setEditingExp((prev) => prev ? { ...prev, amount: v } : prev)}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#475569"
            />
            <TouchableOpacity className="bg-mint-600 rounded-lg px-4 items-center justify-center" onPress={saveExp}>
              <Ionicons name="checkmark" size={18} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="bg-dark-700 rounded-lg px-3 items-center justify-center" onPress={() => setEditingExp(null)}>
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>
      )
    }
    return (
      <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
        <View className="flex-1">
          <Text className="text-dark-200 text-sm">{e.description}</Text>
          {e.dm_expense_categories && <Text className="text-dark-500 text-xs">{e.dm_expense_categories.name}</Text>}
        </View>
        <View className="flex-row items-center gap-3">
          <Text className="text-white text-sm font-medium">{fmt(e.amount)}</Text>
          {editMode && (
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => startEditExp(e)}>
                <Ionicons name="pencil-outline" size={16} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(e.id, e.description)}>
                <Ionicons name="trash-outline" size={16} color="#f87171" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <NovaDespesaModal visible={showModal} onClose={() => setShowModal(false)} month={MONTH} year={YEAR} />
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View className="mt-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-dark-400 text-sm">Maio 2026</Text>
            <Text className="text-white text-2xl font-bold">Orçamento</Text>
          </View>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`rounded-xl px-3 py-2 border flex-row items-center gap-1 ${editMode ? 'border-mint-600 bg-mint-900' : 'border-dark-600 bg-dark-800'}`}
              onPress={() => { setEditMode(!editMode); setEditingExp(null) }}
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
              <Text className="text-white font-medium text-xs">Nova</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? <ActivityIndicator color="#14b8a6" className="mt-20" /> : (
          <>
            {/* Salário */}
            <View className="bg-mint-900 border border-mint-700 rounded-2xl p-4 mb-4">
              <Text className="text-mint-300 text-xs mb-1">Rendimento Líquido</Text>
              {editingSalary ? (
                <View className="flex-row gap-2 items-center">
                  <TextInput
                    className="bg-dark-800 text-white rounded-xl px-4 py-3 text-xl font-bold flex-1 border border-dark-600"
                    value={salaryInput}
                    onChangeText={setSalaryInput}
                    keyboardType="decimal-pad"
                    autoFocus
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
                  <Text className="text-white text-3xl font-bold">{fmt(data?.totalIncome ?? 0)}</Text>
                  {editMode && <Ionicons name="pencil-outline" size={16} color="#5eead4" />}
                </TouchableOpacity>
              )}
              <View className="flex-row justify-between mt-3">
                <View>
                  <Text className="text-dark-400 text-xs">Despesas</Text>
                  <Text className="text-red-400 font-semibold">{fmt((data?.totalFixed ?? 0) + (data?.totalVariable ?? 0))}</Text>
                </View>
                <View>
                  <Text className="text-dark-400 text-xs">Poupança</Text>
                  <Text className="text-mint-400 font-semibold">{fmt(data?.totalSavings ?? 0)}</Text>
                </View>
                <View>
                  <Text className="text-dark-400 text-xs">Disponível</Text>
                  <Text className="text-white font-semibold">
                    {fmt((data?.totalIncome ?? 0) - (data?.totalFixed ?? 0) - (data?.totalVariable ?? 0) - (data?.totalSavings ?? 0))}
                  </Text>
                </View>
              </View>
            </View>

            {/* Despesas fixas */}
            {(data?.fixed?.length ?? 0) > 0 && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white font-semibold">Despesas Fixas</Text>
                  <Text className="text-red-400 font-semibold">{fmt(data!.totalFixed)}</Text>
                </View>
                {data!.fixed.map((e: any) => <ExpenseRow key={e.id} e={e} />)}
              </View>
            )}

            {/* Variáveis */}
            {(data?.variable?.length ?? 0) > 0 && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white font-semibold">Despesas Variáveis</Text>
                  <Text className="text-red-400 font-semibold">{fmt(data!.totalVariable)}</Text>
                </View>
                {data!.variable.map((e: any) => <ExpenseRow key={e.id} e={e} />)}
              </View>
            )}

            {/* Poupança */}
            {(data?.savings?.length ?? 0) > 0 && (
              <View className="bg-dark-800 rounded-2xl p-4 mb-8">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-white font-semibold">Poupança & Investimento</Text>
                  <Text className="text-mint-400 font-semibold">{fmt(data!.totalSavings)}</Text>
                </View>
                {data!.savings.map((e: any) => <ExpenseRow key={e.id} e={e} />)}
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
