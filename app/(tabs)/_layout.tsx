import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

const TAB_COLOR_ACTIVE   = '#0d9488'
const TAB_COLOR_INACTIVE = '#94a3b8'
const TAB_BG             = '#ffffff'

// Hides a route from the tab bar while keeping it routable
const hidden = { tabBarButton: () => null } as const

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
      {/* ── Visible tabs (5) ── */}
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
            <Ionicons name="trending-up-outline" size={size} color={color} />
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
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Hidden tabs — routable via mais.tsx ── */}
      <Tabs.Screen name="creditos"    options={{ title: 'Créditos',    ...hidden }} />
      <Tabs.Screen name="comissoes"   options={{ title: 'Comissões',   ...hidden }} />
      <Tabs.Screen name="relatorios"  options={{ title: 'Relatórios',  ...hidden }} />
      <Tabs.Screen name="fiscal"      options={{ title: 'Fisco',       ...hidden }} />
      <Tabs.Screen name="ferramentas" options={{ title: 'Ferramentas', ...hidden }} />
    </Tabs>
    </View>
  )
}
