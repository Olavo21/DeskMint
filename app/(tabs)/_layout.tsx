import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePlan } from '../../hooks/usePlan'

const TAB_COLOR_ACTIVE   = '#0d9488' // teal-600 — accessible on white (5:1 contrast)
const TAB_COLOR_INACTIVE = '#94a3b8' // muted gray
const TAB_COLOR_LOCKED   = '#d1d5db' // light disabled
const TAB_BG             = '#ffffff' // white tab bar

export default function TabsLayout() {
  const plan = usePlan()

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: '#d1fae5',
          borderTopWidth: 1,
          paddingBottom: 8,
          height: 64,
          shadowColor: '#14b8a6',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: TAB_COLOR_ACTIVE,
        tabBarInactiveTintColor: TAB_COLOR_INACTIVE,
        tabBarLabelStyle: { fontSize: 11, marginTop: -4 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orcamento"
        options={{
          title: 'Orçamento',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="investimentos"
        options={{
          title: 'Investimentos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={plan.canAccessInvestimentos ? 'trending-up-outline' : 'lock-closed-outline'}
              size={size}
              color={plan.canAccessInvestimentos ? color : TAB_COLOR_LOCKED}
            />
          ),
          tabBarLabelStyle: { color: plan.canAccessInvestimentos ? undefined : TAB_COLOR_LOCKED },
        }}
      />
      <Tabs.Screen
        name="creditos"
        options={{
          title: 'Créditos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="comissoes"
        options={{
          title: 'Comissões',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={plan.canAccessComissoes ? 'checkmark-circle-outline' : 'lock-closed-outline'}
              size={size}
              color={plan.canAccessComissoes ? color : TAB_COLOR_LOCKED}
            />
          ),
          tabBarLabelStyle: { color: plan.canAccessComissoes ? undefined : TAB_COLOR_LOCKED },
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={plan.canAccessRelatorios ? 'bar-chart-outline' : 'lock-closed-outline'}
              size={size}
              color={plan.canAccessRelatorios ? color : TAB_COLOR_LOCKED}
            />
          ),
          tabBarLabelStyle: { color: plan.canAccessRelatorios ? undefined : TAB_COLOR_LOCKED },
        }}
      />
      <Tabs.Screen
        name="fiscal"
        options={{
          title: 'Fisco',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ferramentas"
        options={{
          title: 'Ferramentas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'Assistente',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  )
}
