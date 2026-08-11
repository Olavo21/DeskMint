import Header from '../../components/ui/Header'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ScrollView, View, Text, ActivityIndicator,
  TouchableOpacity, TextInput, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { useExpenses } from '../../hooks/useExpenses'
import type { SourcedExpense } from '../../hooks/useExpenses'
import { useIncome } from '../../hooks/useIncome'
import { useSavingBuckets, type SavingBucket } from '../../hooks/useSavingBuckets'
import NovaDespesaModal from '../../components/budget/NovaDespesaModal'
import NovoBucketModal from '../../components/savings/NovoBucketModal'
import AddAmountModal from '../../components/savings/AddAmountModal'
import BucketCard from '../../components/savings/BucketCard'
import { getExpenseEmoji } from '../../lib/expenseEmoji'
import { confirmDestructive } from '../../lib/confirmDialog'
import { useFmt } from '../../utils/format'
import { useTranslation } from 'react-i18next'

const REAL_TODAY = new Date()
const REAL_MONTH = REAL_TODAY.getMonth() + 1
const REAL_YEAR  = REAL_TODAY.getFullYear()

type ExpenseItem = {
  id: string
  description: string | null
  amount: number
  dm_expense_categories?: { name: string; icon?: string | null } | null
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

function ExpenseRow({
  e, editMode, isEditing, deletingId,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}: ExpenseRowProps) {
  const fmt   = useFmt()
  const { t } = useTranslation()
  const [localDesc, setLocalDesc] = useState(e.description ?? '')
  const [localAmt, setLocalAmt] = useState(String(e.amount))

  // Só repõe o texto local quando entra em modo de edição — nunca enquanto
  // o utilizador escreve, para um refetch em segundo plano não apagar o que está a escrever.
  useEffect(() => {
    if (isEditing) {
      setLocalDesc(e.description ?? '')
      setLocalAmt(String(e.amount))
    }
  }, [isEditing])

  function handleTrashPress() {
    confirmDestructive(
      t('budget.deleteExpense'),
      t('budget.deleteExpenseConfirm', { name: e.description }),
      t('common.delete'),
      () => onDelete(e.id)
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
            style={{ color: '#0f172a', minWidth: 0 }}
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
                onSaveEdit(e.id, localDesc.trim() || (e.description ?? ''), val)
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

  const emoji = getExpenseEmoji(e.description ?? '', e.dm_expense_categories?.icon)

  return (
    <View className="flex-row justify-between items-center py-3 border-b border-dark-700">
      <View className="flex-1 mr-2">
        <Text className="text-dark-200 text-sm">{emoji} {e.description ?? ''}</Text>
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
  const fmt   = useFmt()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading, isFetching, update, remove } = useExpenses(REAL_MONTH, REAL_YEAR)
  const { data: income, upsert: upsertIncome } = useIncome(REAL_MONTH, REAL_YEAR)

  // Ref estável para o remove.mutate — evita closures stale no Alert callback
  const removeRef = useRef(remove.mutate)
  useEffect(() => { removeRef.current = remove.mutate }, [remove.mutate])

  // Ref estável para a lista de despesas — usada no handleDelete para determinar a source
  const allExpensesRef = useRef<SourcedExpense[]>([])
  useEffect(() => { allExpensesRef.current = data?.expenses ?? [] }, [data])

  const buckets = useSavingBuckets()

  const [showModal, setShowModal]         = useState(false)
  const [showBucketModal, setShowBucketModal] = useState(false)
  const [selectedBucket, setSelectedBucket]   = useState<SavingBucket | null>(null)
  const [editingBucket, setEditingBucket]     = useState<SavingBucket | null>(null)
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
    const source = (data?.expenses ?? []).find((e) => e.id === id)?._source ?? 'expense'
    await update.mutateAsync({ id, description, amount, _source: source })
    setEditingId(null)
  }

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id)
    const source = allExpensesRef.current.find((e) => e.id === id)?._source ?? 'expense'
    removeRef.current({ id, _source: source }, {
      onSettled: () => setDeletingId(null),
    })
  }, [])

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header />
      <NovaDespesaModal visible={showModal} onClose={() => setShowModal(false)} month={REAL_MONTH} year={REAL_YEAR} />
      <NovoBucketModal
        visible={showBucketModal}
        onClose={() => { setShowBucketModal(false); setEditingBucket(null) }}
        onCreate={(payload) => buckets.create.mutate(payload)}
        onUpdate={(id, payload) => buckets.update.mutate({ id, payload })}
        isPending={editingBucket ? buckets.update.isPending : buckets.create.isPending}
        initialBucket={editingBucket}
      />
      <AddAmountModal
        bucket={selectedBucket}
        onClose={() => setSelectedBucket(null)}
        onConfirm={(id, amount) => buckets.addAmount.mutate({ id, amount })}
        isPending={buckets.addAmount.isPending}
      />
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
        <View className="mt-4 mb-6">
          <View className="flex-row justify-between items-center">
          <Text className="text-dark-50 text-2xl font-bold">{t('budget.title')}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`rounded-xl px-3 py-2 border flex-row items-center gap-1 ${editMode ? 'border-mint-600 bg-mint-900' : 'border-dark-600 bg-dark-800'}`}
              onPress={() => { setEditMode(!editMode); setEditingId(null) }}
            >
              <Ionicons name={editMode ? 'checkmark-done-outline' : 'create-outline'} size={15} color={editMode ? '#14b8a6' : '#94a3b8'} />
              <Text className={`text-xs font-medium ${editMode ? 'text-mint-400' : 'text-dark-400'}`}>
                {editMode ? t('common.done') : t('common.edit')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-mint-600 rounded-xl px-3 py-2 flex-row items-center gap-1"
              onPress={() => setShowModal(true)}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text className="text-dark-50 font-medium text-xs">{t('budget.new')}</Text>
            </TouchableOpacity>
          </View>
          </View>
        </View>

        {isLoading ? <ActivityIndicator color="#14b8a6" className="mt-20" /> : (
          <>
            {(() => {
              const fixedCosts   = data?.fixed.filter((e) => e.dm_expense_categories?.type !== 'SAVINGS') ?? []
              const fixedSavings = data?.fixed.filter((e) => e.dm_expense_categories?.type === 'SAVINGS') ?? []
              const totalCosts   = fixedCosts.reduce((s, e) => s + e.amount, 0)
              const totalSav     = fixedSavings.reduce((s, e) => s + e.amount, 0)
              const netIncome    = data?.totalIncome ?? 0
              const available    = netIncome - totalCosts - totalSav

              return (
                <>
                  {/* Balanço */}
                  <View className="bg-mint-100 border border-mint-300 rounded-2xl p-4 mb-4">
                    <Text className="text-mint-700 text-xs mb-1">{t('budget.netIncome')}</Text>
                    {editingSalary ? (
                      <View className="flex-row gap-2 items-center">
                        <TextInput
                          className="bg-dark-800 rounded-xl px-4 py-3 text-xl font-bold flex-1 border border-dark-600"
                          style={{ color: '#0f172a', minWidth: 0 }}
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
                        <Text className="text-dark-50 text-3xl font-bold">{fmt(netIncome)}</Text>
                        {editMode && <Ionicons name="pencil-outline" size={16} color="#0f766e" />}
                      </TouchableOpacity>
                    )}
                    <View className="flex-row justify-between mt-3">
                      <View>
                        <Text className="text-dark-300 text-xs">{t('dashboard.expensesLabel')}</Text>
                        <Text className="text-red-500 font-semibold">{fmt(totalCosts)}</Text>
                      </View>
                      <View>
                        <Text className="text-dark-300 text-xs">{t('dashboard.savingsLabel')}</Text>
                        <Text className="text-mint-700 font-semibold">{fmt(totalSav)}</Text>
                      </View>
                      <View>
                        <Text className="text-dark-300 text-xs">{t('budget.available')}</Text>
                        <Text className="text-dark-50 font-semibold">{fmt(available)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Despesas fixas (NEEDS + WANTS) */}
                  {fixedCosts.length > 0 && (
                    <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-dark-50 font-semibold">{t('budget.fixedExpenses')}</Text>
                        <Text className="text-red-700 font-semibold">{fmt(totalCosts)}</Text>
                      </View>
                      {fixedCosts.map((e) => (
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

                  {/* Poupança fixa recorrente */}
                  {fixedSavings.length > 0 && (
                    <View className="bg-dark-800 rounded-2xl p-4 mb-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-dark-50 font-semibold">{t('budget.savingsInvestment')}</Text>
                        <Text className="text-mint-800 font-semibold">{fmt(totalSav)}</Text>
                      </View>
                      {fixedSavings.map((e) => (
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
                      {netIncome > 0 && (
                        <Text className="text-dark-400 text-xs mt-3">
                          {t('budget.savingsRate', { rate: ((totalSav / netIncome) * 100).toFixed(1) })}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Objetivos de Poupança */}
                  <View className="mb-8">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-dark-50 font-semibold">{t('budget.savingsGoals')}</Text>
                <TouchableOpacity
                  onPress={() => setShowBucketModal(true)}
                  className="flex-row items-center gap-1 bg-dark-800 border border-dark-600 rounded-xl px-3 py-2"
                >
                  <Ionicons name="add" size={15} color="#14b8a6" />
                  <Text style={{ color: '#14b8a6', fontSize: 12, fontWeight: '600' }}>{t('budget.newGoal')}</Text>
                </TouchableOpacity>
              </View>

              {buckets.isLoading ? (
                <ActivityIndicator color="#14b8a6" />
              ) : (buckets.data?.length ?? 0) === 0 ? (
                <View className="bg-dark-800 border border-dark-600 border-dashed rounded-2xl p-6 items-center">
                  <Text style={{ fontSize: 32 }}>🎯</Text>
                  <Text className="text-dark-300 text-sm font-medium mt-2">{t('budget.noGoals')}</Text>
                  <Text className="text-dark-500 text-xs text-center mt-1">
                    {t('budget.noGoalsSub')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowBucketModal(true)}
                    className="mt-4 px-5 py-2 rounded-xl"
                    style={{ backgroundColor: '#14b8a6' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{t('budget.createGoal')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                buckets.data!.map((bucket) => (
                  <BucketCard
                    key={bucket.id}
                    bucket={bucket}
                    onAddAmount={(b) => setSelectedBucket(b)}
                    onEdit={(b) => { setEditingBucket(b); setShowBucketModal(true) }}
                    onDelete={(id) => confirmDestructive(
                      t('budget.savingsGoals'),
                      'Tens a certeza? O progresso guardado será perdido.',
                      t('common.delete'),
                      () => buckets.remove.mutate(id)
                    )}
                  />
                ))
              )}
                  </View>
                </>
              )
            })()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
