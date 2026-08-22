import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThresholdAlerts, THRESHOLD_COLOR } from '../../hooks/useThresholdAlerts'
import { useLookThrough } from '../../hooks/useEtfComposition'
import ThresholdsModal from './ThresholdsModal'
import type { DmPortfolioAsset } from '../../types/database'

type Props = { assets: DmPortfolioAsset[] }

const STATUS_LABEL = { ok: 'Todos os tetos respeitados', warning: 'aviso', breached: 'teto excedido' }

export default function ThresholdAlertsCard({ assets }: Props) {
  const [showModal, setShowModal] = useState(false)
  const lookThrough = useLookThrough(assets)
  const { alerts, breachedCount, warningCount, isLoading } = useThresholdAlerts(
    assets,
    lookThrough.data ?? [],
  )

  if (isLoading || alerts.length === 0) {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{
            marginHorizontal: 16, marginBottom: 12,
            backgroundColor: '#1e293b', borderRadius: 14,
            padding: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            borderWidth: 1, borderColor: '#1e293b',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#14b8a615', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="shield-checkmark-outline" size={17} color="#14b8a6" />
            </View>
            <View>
              <Text style={{ color: '#f8faf9', fontSize: 13, fontWeight: '600' }}>
                {isLoading ? 'A verificar tetos…' : 'Nenhum teto configurado'}
              </Text>
              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>Toca para gerir</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#334155" />
        </TouchableOpacity>
        <ThresholdsModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          assets={assets}
          lookThroughEntries={lookThrough.data ?? []}
        />
      </>
    )
  }

  const overallStatus = breachedCount > 0 ? 'breached' : warningCount > 0 ? 'warning' : 'ok'
  const color = THRESHOLD_COLOR[overallStatus]

  const summaryText = breachedCount > 0
    ? `${breachedCount} teto${breachedCount > 1 ? 's' : ''} excedido${breachedCount > 1 ? 's' : ''}`
    : warningCount > 0
    ? `${warningCount} aviso${warningCount > 1 ? 's' : ''}`
    : 'Todos os tetos respeitados'

  const iconName: 'shield-checkmark' | 'warning' | 'alert-circle' =
    overallStatus === 'ok'       ? 'shield-checkmark'
    : overallStatus === 'warning' ? 'warning'
    : 'alert-circle'

  // Show worst 3 alerts
  const topAlerts = [...alerts]
    .sort((a, b) => {
      const rank = { breached: 2, warning: 1, ok: 0 }
      return rank[b.status] - rank[a.status]
    })
    .slice(0, 3)

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={{
          marginHorizontal: 16, marginBottom: 12,
          backgroundColor: '#1e293b', borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: overallStatus !== 'ok' ? `${color}30` : '#1e293b',
        }}
      >
        {/* Summary row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: topAlerts.length > 0 ? 12 : 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 32, height: 32, borderRadius: 10,
              backgroundColor: `${color}15`,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={iconName} size={17} color={color} />
            </View>
            <View>
              <Text style={{ color: '#f8faf9', fontSize: 13, fontWeight: '700' }}>{summaryText}</Text>
              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 1 }}>
                {alerts.length} bloco{alerts.length > 1 ? 's' : ''} monitorizado{alerts.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#334155" />
        </View>

        {/* Top alerts preview */}
        {topAlerts.filter((a) => a.status !== 'ok').map((alert) => {
          const ac = THRESHOLD_COLOR[alert.status]
          const refPct = alert.max_pct ?? alert.min_pct ?? 100
          const isMin  = alert.max_pct === null

          return (
            <View key={alert.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>{alert.block_name}</Text>
                <Text style={{ color: ac, fontSize: 11, fontWeight: '600' }}>
                  {alert.currentPct.toFixed(1)}% {isMin ? `/ mín ${refPct}%` : `/ teto ${refPct}%`}
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  height: 4,
                  width: `${Math.min(alert.fillPct * 100, 100)}%`,
                  backgroundColor: ac,
                  borderRadius: 3,
                }} />
              </View>
            </View>
          )
        })}
      </TouchableOpacity>

      <ThresholdsModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        assets={assets}
        lookThroughEntries={lookThrough.data ?? []}
      />
    </>
  )
}
