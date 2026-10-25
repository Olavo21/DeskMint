import { useState, useEffect } from 'react'
import {
  Modal, View, Text, TextInput, TouchableOpacity, Switch,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import DateTimePicker from '../ui/CrossDateTimePicker'
import { useSavingsAccounts, type SavingsPayload } from '../../hooks/useSavingsAccounts'
import { confirmDestructive } from '../../lib/confirmDialog'
import { netRate, parseDateOnly, toDateOnly, SAVINGS_WITHHOLDING_RATE } from '../../lib/savings'
import { formatPct } from '../../utils/format'
import type { DmSavingsAccount, Enums } from '../../types/database'

type Kind = Enums<'dm_savings_kind'>
const KINDS: Kind[] = ['term_deposit', 'savings_account', 'savings_certificate', 'other']
const MAX_BALANCE = 99_999_999.99 // numeric(10,2) na tabela

type Props = {
  visible: boolean
  onClose: () => void
  account?: DmSavingsAccount | null
}

const LABEL = 'text-dark-400 text-xs font-semibold uppercase tracking-widest mb-2'
const INPUT = 'bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 mb-4'

export default function SavingsAccountModal({ visible, onClose, account }: Props) {
  const { t, i18n } = useTranslation()
  const { create, update, remove } = useSavingsAccounts()
  const isEdit = !!account

  const [kind, setKind]               = useState<Kind>('term_deposit')
  const [name, setName]               = useState('')
  const [institution, setInstitution] = useState('')
  const [balance, setBalance]         = useState('')
  const [rate, setRate]               = useState('')
  const [startDate, setStartDate]     = useState(new Date())
  const [maturity, setMaturity]       = useState<Date | null>(null)
  const [notes, setNotes]             = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [picker, setPicker]           = useState<'start' | 'maturity' | null>(null)
  const [error, setError]             = useState('')

  useEffect(() => {
    if (!visible) return
    setKind(account?.kind ?? 'term_deposit')
    setName(account?.name ?? '')
    setInstitution(account?.institution ?? '')
    setBalance(account ? String(account.balance) : '')
    setRate(account ? String(account.gross_rate) : '')
    setStartDate(account ? parseDateOnly(account.start_date) : new Date())
    setMaturity(account?.maturity_date ? parseDateOnly(account.maturity_date) : null)
    setNotes(account?.notes ?? '')
    setIsEmergency(account?.is_emergency_fund ?? false)
    setPicker(null)
    setError('')
  }, [visible, account])

  const pending = create.isPending || update.isPending || remove.isPending
  const fmtDate = (d: Date) => d.toLocaleDateString(i18n.language)
  const rateNum = parseFloat(rate.replace(',', '.'))

  async function handleSubmit() {
    const amount = parseFloat(balance.replace(',', '.'))
    if (!name.trim()) { setError(t('savingsProducts.errName')); return }
    if (isNaN(amount) || amount < 0 || amount > MAX_BALANCE) { setError(t('savingsProducts.errBalance')); return }
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) { setError(t('savingsProducts.errRate')); return }
    if (maturity && toDateOnly(maturity) < toDateOnly(startDate)) { setError(t('savingsProducts.errMaturity')); return }

    const payload: SavingsPayload = {
      kind,
      name: name.trim(),
      institution: institution.trim() || null,
      balance: Math.round(amount * 100) / 100,
      gross_rate: Math.round(rateNum * 1000) / 1000,
      start_date: toDateOnly(startDate),
      maturity_date: maturity ? toDateOnly(maturity) : null,
      notes: notes.trim() || null,
      is_emergency_fund: isEmergency,
    }
    setError('')
    try {
      if (isEdit) await update.mutateAsync({ id: account!.id, payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (e) {
      // 23505: o índice único parcial só deixa um fundo de emergência por utilizador.
      const code = (e as { code?: string }).code
      setError(t(code === '23505' ? 'savingsProducts.errEmergencyTaken' : 'common.saveError'))
    }
  }

  function handleDelete() {
    if (!account) return
    confirmDestructive(t('savingsProducts.deleteTitle'), t('savingsProducts.deleteBody'), t('common.delete'), async () => {
      try {
        await remove.mutateAsync(account.id)
        onClose()
      } catch {
        setError(t('common.saveError'))
      }
    })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      >
        <View className="flex-1" />
        <View className="bg-dark-900 rounded-t-3xl p-6" style={{ maxHeight: '92%' }}>
          <View className="w-10 h-1 bg-dark-600 rounded-full self-center mb-5" />

          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-dark-50 text-lg font-bold">
              {t(isEdit ? 'savingsProducts.editTitle' : 'savingsProducts.newTitle')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text className={LABEL}>{t('savingsProducts.fieldKind')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {KINDS.map((k) => {
                const active = k === kind
                return (
                  <TouchableOpacity
                    key={k}
                    onPress={() => setKind(k)}
                    className={`px-3 py-2 rounded-xl border ${active ? 'bg-teal-500/15 border-teal-500/40' : 'bg-dark-800 border-dark-600'}`}
                  >
                    <Text className={`text-sm ${active ? 'text-teal-400 font-semibold' : 'text-dark-400'}`}>
                      {t(`savingsProducts.kind_${k}`)}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text className={LABEL}>{t('savingsProducts.fieldName')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={80}
              placeholder={t('savingsProducts.namePlaceholder')}
              placeholderTextColor="#475569"
              className={INPUT}
              style={{ color: '#0f172a', fontSize: 15 }}
            />

            <Text className={LABEL}>{t('savingsProducts.fieldInstitution')}</Text>
            <TextInput
              value={institution}
              onChangeText={setInstitution}
              maxLength={80}
              placeholder={t('savingsProducts.institutionPlaceholder')}
              placeholderTextColor="#475569"
              className={INPUT}
              style={{ color: '#0f172a', fontSize: 15 }}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className={LABEL}>{t('savingsProducts.fieldBalance')}</Text>
                <TextInput
                  value={balance}
                  onChangeText={setBalance}
                  maxLength={12}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#475569"
                  className={INPUT}
                  style={{ color: '#0f172a', fontSize: 15 }}
                />
              </View>
              <View className="flex-1">
                <Text className={LABEL} numberOfLines={1}>{t('savingsProducts.fieldGrossRate')}</Text>
                <TextInput
                  value={rate}
                  onChangeText={setRate}
                  maxLength={7}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#475569"
                  className={INPUT}
                  style={{ color: '#0f172a', fontSize: 15 }}
                />
              </View>
            </View>
            {!isNaN(rateNum) && rateNum >= 0 && rateNum <= 100 && (
              <Text className="text-dark-500 text-xs -mt-2 mb-4">
                {t('savingsProducts.net')}: ≈ {formatPct(netRate(rateNum), i18n.language, 2, 2)}% · {t('savingsProducts.netNote', { pct: formatPct(SAVINGS_WITHHOLDING_RATE * 100, i18n.language) })}
              </Text>
            )}

            <Text className={LABEL}>{t('savingsProducts.fieldStartDate')}</Text>
            <TouchableOpacity
              onPress={() => setPicker('start')}
              className={`${INPUT} flex-row items-center justify-between`}
            >
              <Text style={{ color: '#0f172a', fontSize: 15 }}>{fmtDate(startDate)}</Text>
              <Ionicons name="calendar-outline" size={16} color="#475569" />
            </TouchableOpacity>

            <Text className={LABEL}>{t('savingsProducts.fieldMaturity')}</Text>
            <TouchableOpacity
              onPress={() => setPicker('maturity')}
              className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 flex-row items-center justify-between"
              style={{ marginBottom: maturity ? 6 : 16 }}
            >
              <Text style={{ color: maturity ? '#0f172a' : '#475569', fontSize: 15 }}>
                {maturity ? fmtDate(maturity) : t('savingsProducts.noMaturity')}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#475569" />
            </TouchableOpacity>
            {maturity && (
              <TouchableOpacity onPress={() => setMaturity(null)} className="mb-4 self-start pl-1">
                <Text className="text-dark-500 text-xs">{t('savingsProducts.removeMaturity')}</Text>
              </TouchableOpacity>
            )}

            {picker && (
              <DateTimePicker
                value={(picker === 'start' ? startDate : maturity) ?? startDate}
                mode="date"
                display="default"
                minimumDate={picker === 'maturity' ? startDate : undefined}
                onChange={(_event, date) => {
                  if (Platform.OS !== 'ios') setPicker(null)
                  if (!date) return
                  if (picker === 'start') setStartDate(date)
                  else setMaturity(date)
                }}
              />
            )}

            <Text className={LABEL}>{t('savingsProducts.fieldNotes')}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              maxLength={500}
              multiline
              className={INPUT}
              style={{ color: '#0f172a', fontSize: 15, minHeight: 60, textAlignVertical: 'top' }}
            />

            <View className="flex-row items-center justify-between bg-dark-800 border border-dark-600 rounded-xl px-4 py-3">
              <Text className="text-dark-200 text-sm font-medium flex-1 mr-3">{t('savingsProducts.fieldEmergency')}</Text>
              <Switch value={isEmergency} onValueChange={setIsEmergency} trackColor={{ true: '#14b8a6' }} />
            </View>
            <Text className="text-dark-500 text-xs mt-2 mb-4">{t('savingsProducts.emergencyHint')}</Text>

            {!!error && (
              <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <Text className="text-red-600 text-sm">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={pending}
              className="rounded-2xl py-4 items-center bg-teal-500"
              style={{ opacity: pending ? 0.5 : 1 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {pending ? t('common.loading') : t('common.save')}
              </Text>
            </TouchableOpacity>

            {isEdit && (
              <TouchableOpacity onPress={handleDelete} disabled={pending} className="py-4 items-center">
                <Text className="text-red-500 text-sm font-semibold">{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
            <View className="h-6" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
