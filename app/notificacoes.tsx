import { useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useNotifications, type DmNotification } from '../hooks/useNotifications'

const TYPE_COLOR: Record<string, string> = {
  warning: '#f59e0b',
  info:    '#14b8a6',
  success: '#22c55e',
}

const TYPE_BG: Record<string, string> = {
  warning: '#fffbeb',
  info:    '#f0fdfa',
  success: '#f0fdf4',
}

const TYPE_ICON: Record<string, string> = {
  warning: 'warning-outline',
  info:    'information-circle-outline',
  success: 'checkmark-circle-outline',
}

function NotificationCard({ item }: { item: DmNotification }) {
  const color = TYPE_COLOR[item.type] ?? '#64748b'
  const bg    = TYPE_BG[item.type]   ?? '#f8fafc'
  const icon  = TYPE_ICON[item.type] ?? 'notifications-outline'
  const date  = new Date(item.created_at)
  const label = date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: color,
        opacity: item.is_read ? 0.65 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Ionicons name={icon as any} size={16} color={color} />
        <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700', flex: 1 }}>
          {item.title}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 11 }}>{label}</Text>
      </View>
      <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18 }}>{item.message}</Text>
    </View>
  )
}

export default function NotificacoesScreen() {
  const { data: notifications = [], isLoading, markAllRead } = useNotifications()

  useEffect(() => {
    markAllRead.mutate()
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Cabeçalho */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
          paddingTop: 8, paddingBottom: 12,
          borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
          backgroundColor: '#115e59',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={20} color="#ccfbef" />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700', flex: 1 }}>
          Notificações
        </Text>
        <Ionicons name="notifications-outline" size={18} color="#ccfbef" />
      </View>

      {isLoading ? (
        <ActivityIndicator color="#14b8a6" style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.5 }}>
          <Ionicons name="notifications-off-outline" size={44} color="#94a3b8" />
          <Text style={{ color: '#64748b', fontSize: 14 }}>Sem notificações</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((n) => (
            <NotificationCard key={n.id} item={n} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
