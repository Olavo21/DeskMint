import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const TAB_COLOR_ACTIVE   = '#0d9488'
const TAB_COLOR_INACTIVE = '#94a3b8'
const TAB_BG             = '#ffffff'

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: TAB_BG,
            borderTopColor: '#d1fae5',
            borderTopWidth: 1,
            paddingBottom: 6,
            height: 60,
            shadowColor: '#14b8a6',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 8,
          },
          tabBarActiveTintColor: TAB_COLOR_ACTIVE,
          tabBarInactiveTintColor: TAB_COLOR_INACTIVE,
          tabBarLabelStyle: { fontSize: 9, marginTop: -2 },
          tabBarIconStyle: { marginBottom: -2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ color }) => (
              <Ionicons name="grid-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orcamento"
          options={{
            title: 'Orçamento',
            tabBarIcon: ({ color }) => (
              <Ionicons name="wallet-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="investimentos"
          options={{
            title: 'Invest.',
            tabBarIcon: ({ color }) => (
              <Ionicons name="trending-up-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="assistente"
          options={{
            title: 'Assist.',
            tabBarIcon: ({ color }) => (
              <Ionicons name="sparkles-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="creditos"
          options={{
            title: 'Créditos',
            tabBarIcon: ({ color }) => (
              <Ionicons name="card-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="comissoes"
          options={{
            title: 'Comissões',
            tabBarIcon: ({ color }) => (
              <Ionicons name="checkmark-circle-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="relatorios"
          options={{
            title: 'Relat.',
            tabBarIcon: ({ color }) => (
              <Ionicons name="bar-chart-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="fiscal"
          options={{
            title: 'Fisco',
            tabBarIcon: ({ color }) => (
              <Ionicons name="receipt-outline" size={20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ferramentas"
          options={{
            title: 'Ferrament.',
            tabBarIcon: ({ color }) => (
              <Ionicons name="construct-outline" size={20} color={color} />
            ),
          }}
        />

        {/* Mais screen still exists as a route but is hidden from the tab bar */}
        <Tabs.Screen
          name="mais"
          options={{ href: null }}
        />
      </Tabs>
    </View>
  )
}
