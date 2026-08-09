import { ScrollView, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Header from '../../components/ui/Header'

const ITEMS: {
  label: string
  desc: string
  icon: string
  color: string
  bg: string
  route: string
}[] = [
  {
    label: 'Créditos',
    desc:  'Gestão de créditos e empréstimos',
    icon:  'card-outline',
    color: '#6366f1',
    bg:    '#6366f115',
    route: '/(tabs)/creditos',
  },
  {
    label: 'Comissões',
    desc:  'Registo e análise de comissões',
    icon:  'checkmark-circle-outline',
    color: '#10b981',
    bg:    '#10b98115',
    route: '/(tabs)/comissoes',
  },
  {
    label: 'Relatórios',
    desc:  'Relatórios financeiros detalhados',
    icon:  'bar-chart-outline',
    color: '#f97316',
    bg:    '#f9731615',
    route: '/(tabs)/relatorios',
  },
  {
    label: 'Fisco',
    desc:  'Simulador fiscal e mais-valias',
    icon:  'receipt-outline',
    color: '#ef4444',
    bg:    '#ef444415',
    route: '/(tabs)/fiscal',
  },
  {
    label: 'Ferramentas',
    desc:  'Calculadoras e simuladores',
    icon:  'construct-outline',
    color: '#8b5cf6',
    bg:    '#8b5cf615',
    route: '/(tabs)/ferramentas',
  },
]

export default function MaisScreen() {
  const router = useRouter()

  return (
    <SafeAreaView className="flex-1 bg-dark-900">
      <Header title="Mais" />

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Módulos
        </Text>

        <View className="gap-3">
          {ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center gap-4 bg-dark-800 border border-dark-600 rounded-2xl px-4 py-4"
              activeOpacity={0.7}
            >
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: item.bg }}
              >
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <View className="flex-1">
                <Text className="text-dark-50 font-semibold text-base">{item.label}</Text>
                <Text className="text-dark-400 text-xs mt-0.5">{item.desc}</Text>
              </View>

              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
