import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Linking, ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMarketNews, NEWS_CATEGORIES, type NewsCategory, type NewsItem } from '../../hooks/useMarketNews'

const HAS_KEY = !!process.env.EXPO_PUBLIC_FINNHUB_KEY
const MAX_VISIBLE = 6

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() / 1000 - unix) / 60)
  if (diff < 60)   return `${diff}m`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  return `${Math.floor(diff / 1440)}d`
}

function CompactNewsCard({ item, accentColor }: { item: NewsItem; accentColor: string }) {
  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.72}
      className="flex-row items-start gap-3 py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: '#c9d4cf' }}
    >
      <View className="mt-1.5 flex-shrink-0">
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accentColor }} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-dark-100 text-sm font-semibold leading-5" numberOfLines={2}>
          {item.headline}
        </Text>
        <Text className="text-dark-500 text-xs mt-0.5">
          {item.source} · {timeAgo(item.datetime)}
        </Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={13} color="#94a3b8" style={{ marginTop: 3, flexShrink: 0 }} />
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
  const [showAll, setShowAll] = useState(false)

  const accentColor = NEWS_CATEGORIES.find((c) => c.key === category)?.color ?? '#14b8a6'

  if (!HAS_KEY) return <NoApiKey />

  if (isLoading) {
    return (
      <View className="py-8 items-center">
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
      <View className="py-8 items-center">
        <Text className="text-dark-500 text-sm">Nenhuma notícia recente</Text>
      </View>
    )
  }

  const seen = new Set<string>()
  const unique = data.filter((item) => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })

  const visible = showAll ? unique : unique.slice(0, MAX_VISIBLE)

  return (
    <>
      {visible.map((item, i) => (
        <CompactNewsCard
          key={`${item.url ?? item.id}-${i}`}
          item={item}
          accentColor={accentColor}
        />
      ))}
      {!showAll && unique.length > MAX_VISIBLE && (
        <TouchableOpacity
          onPress={() => setShowAll(true)}
          className="flex-row items-center justify-center gap-1.5 pt-3"
        >
          <Text className="text-teal-600 text-sm font-medium">
            Ver mais {unique.length - MAX_VISIBLE} notícias
          </Text>
          <Ionicons name="chevron-down-outline" size={14} color="#0d9488" />
        </TouchableOpacity>
      )}
    </>
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

      {/* Feed */}
      <NewsFeed category={category} />
    </View>
  )
}
