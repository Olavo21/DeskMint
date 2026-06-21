import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Linking, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMarketNews, NEWS_CATEGORIES, type NewsCategory, type NewsItem } from '../../hooks/useMarketNews'

const HAS_KEY = !!process.env.EXPO_PUBLIC_FINNHUB_KEY

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() / 1000 - unix) / 60)
  if (diff < 60)   return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

function NewsCard({ item, categoryLabel, accentColor }: {
  item: NewsItem
  categoryLabel: string
  accentColor: string
}) {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.72}
      style={{
        width: 168,
        backgroundColor: '#f8faf9',
        borderWidth: 1,
        borderColor: '#c9d4cf',
        borderRadius: 14,
        padding: 12,
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      {/* Category pill */}
      <View style={{
        alignSelf: 'flex-start',
        backgroundColor: accentColor + '18',
        borderWidth: 1,
        borderColor: accentColor + '44',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}>
        <Text style={{ color: accentColor, fontSize: 10, fontWeight: '700' }}>
          {categoryLabel}
        </Text>
      </View>

      {/* Headline */}
      <Text
        style={{ color: '#0f172a', fontSize: 12, fontWeight: '600', lineHeight: 17, flex: 1 }}
        numberOfLines={3}
      >
        {item.headline}
      </Text>

      {/* Source + time */}
      <Text style={{ color: '#64748b', fontSize: 10 }} numberOfLines={1}>
        {item.source} · {timeAgo(item.datetime)}
      </Text>
    </TouchableOpacity>
  )
}

function NoApiKey() {
  return (
    <View className="bg-dark-800 rounded-2xl p-4 flex-row items-center gap-3">
      <Ionicons name="key-outline" size={22} color="#0d9488" />
      <View className="flex-1">
        <Text className="text-dark-200 font-semibold text-sm">Chave Finnhub em falta</Text>
        <Text className="text-dark-500 text-xs mt-0.5">
          Adiciona EXPO_PUBLIC_FINNHUB_KEY no .env.local
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => Linking.openURL('https://finnhub.io/register')}
        className="bg-teal-500/15 border border-teal-500/30 rounded-lg px-2.5 py-1.5"
      >
        <Text className="text-teal-600 text-xs font-semibold">Registar</Text>
      </TouchableOpacity>
    </View>
  )
}

function NewsFeed({ category }: { category: NewsCategory }) {
  const { data, isLoading, isError, refetch } = useMarketNews(category)

  const cat = NEWS_CATEGORIES.find((c) => c.key === category)
  const accentColor = cat?.color ?? '#14b8a6'
  const categoryLabel = cat?.label ?? category

  if (!HAS_KEY) return <NoApiKey />

  if (isLoading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color="#0d9488" size="small" />
      </View>
    )
  }

  if (isError) {
    return (
      <View className="flex-row items-center justify-between py-4">
        <Text className="text-dark-400 text-sm">Erro ao carregar notícias.</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text className="text-teal-500 text-sm font-medium">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!data || data.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-dark-500 text-sm">Nenhuma notícia recente</Text>
      </View>
    )
  }

  const seen = new Set<string>()
  const unique = data.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  }).slice(0, 10)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingRight: 4 }}
    >
      {unique.map((item, i) => (
        <NewsCard
          key={`${item.url ?? item.id}-${i}`}
          item={item}
          categoryLabel={categoryLabel}
          accentColor={accentColor}
        />
      ))}
    </ScrollView>
  )
}

export default function MarketNews() {
  const [category, setCategory] = useState<NewsCategory>('portfolio')

  return (
    <View>
      {/* Title row */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-dark-100 font-bold text-base">Notícias do Mercado</Text>
        <View className="w-2 h-2 rounded-full bg-teal-500" />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerStyle={{ paddingRight: 8 }}
      >
        <View className="flex-row gap-1.5">
          {NEWS_CATEGORIES.map((cat) => {
            const active = category === cat.key
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                className="flex-row items-center gap-1 rounded-full px-3 py-1.5 border"
                style={{
                  backgroundColor: active ? cat.color + '22' : '#ffffff',
                  borderColor:     active ? cat.color + '88' : '#c9d4cf',
                }}
              >
                <Text style={{ fontSize: 10 }}>{cat.icon}</Text>
                <Text
                  style={{ color: active ? cat.color : '#64748b', fontSize: 11, fontWeight: active ? '700' : '500' }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Horizontal card feed */}
      <NewsFeed category={category} />
    </View>
  )
}
