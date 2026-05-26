import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  Linking, ScrollView, TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useMarketNews, NEWS_CATEGORIES, type NewsCategory, type NewsItem } from '../../hooks/useMarketNews'

const HAS_KEY = !!process.env.EXPO_PUBLIC_FINNHUB_KEY

function timeAgo(unix: number) {
  const diff = Math.floor((Date.now() / 1000 - unix) / 60) // minutes
  if (diff < 60)  return `há ${diff}m`
  if (diff < 1440) return `há ${Math.floor(diff / 60)}h`
  return `há ${Math.floor(diff / 1440)}d`
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const isFirst = index === 0

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.75}
      className="py-4"
      style={{ borderBottomWidth: 1, borderBottomColor: '#1e293b' }}
    >
      {/* Fonte + tempo */}
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-mint-500 text-xs font-semibold uppercase tracking-wide">
          {item.source}
        </Text>
        <Text className="text-dark-600 text-xs">·</Text>
        <Text className="text-dark-500 text-xs">{timeAgo(item.datetime)}</Text>
      </View>

      {/* Título */}
      <Text
        className="text-white leading-5 mb-2"
        style={{ fontSize: isFirst ? 15 : 13, fontWeight: isFirst ? '700' : '600' }}
        numberOfLines={isFirst ? 4 : 3}
      >
        {item.headline}
      </Text>

      {/* Resumo — mais texto como pedido */}
      {item.summary ? (
        <Text className="text-dark-400 text-xs leading-5" numberOfLines={isFirst ? 4 : 3}>
          {item.summary}
        </Text>
      ) : null}

      {/* Ler mais */}
      <View className="flex-row items-center gap-1 mt-2.5">
        <Ionicons name="open-outline" size={11} color="#334155" />
        <Text className="text-dark-600 text-xs">Ler artigo completo</Text>
      </View>
    </TouchableOpacity>
  )
}

function NoApiKey() {
  return (
    <View className="bg-dark-800 rounded-2xl p-5 items-center">
      <Text className="text-2xl mb-3">🔑</Text>
      <Text className="text-white font-semibold text-base mb-2">Chave API em falta</Text>
      <Text className="text-dark-400 text-sm text-center mb-4">
        Adiciona uma chave gratuita da Finnhub para ver notícias do mercado.
      </Text>
      <TouchableOpacity
        className="bg-mint-600 rounded-xl px-4 py-2.5 flex-row items-center gap-2"
        onPress={() => Linking.openURL('https://finnhub.io/register')}
      >
        <Ionicons name="key-outline" size={16} color="white" />
        <Text className="text-white font-medium text-sm">Registar em finnhub.io</Text>
      </TouchableOpacity>
      <Text className="text-dark-600 text-xs mt-3 text-center">
        Gratuito · 60 req/min · Sem cartão
      </Text>
      <Text className="text-dark-500 text-xs mt-3 text-center leading-4">
        Depois adiciona{'\n'}
        <Text className="text-mint-500">EXPO_PUBLIC_FINNHUB_KEY=a_tua_chave</Text>
        {'\n'}ao ficheiro .env.local
      </Text>
    </View>
  )
}

function NewsFeed({ category, search }: { category: NewsCategory; search: string }) {
  const { data, isLoading, isError, refetch } = useMarketNews(category)

  if (!HAS_KEY) return <NoApiKey />

  if (isLoading) {
    return (
      <View className="py-12 items-center">
        <ActivityIndicator color="#14b8a6" />
        <Text className="text-dark-500 text-xs mt-3">A carregar notícias…</Text>
      </View>
    )
  }

  if (isError) {
    return (
      <View className="bg-dark-800 rounded-2xl p-5 items-center">
        <Ionicons name="cloud-offline-outline" size={32} color="#475569" />
        <Text className="text-dark-400 text-sm mt-2 text-center">Erro ao carregar notícias.</Text>
        <TouchableOpacity className="mt-3" onPress={() => refetch()}>
          <Text className="text-mint-400 text-sm">Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!data || data.length === 0) {
    return (
      <View className="py-10 items-center">
        <Ionicons name="newspaper-outline" size={32} color="#334155" />
        <Text className="text-dark-600 text-sm mt-2">Nenhuma notícia recente</Text>
      </View>
    )
  }

  // deduplicar + filtro de pesquisa
  const seen = new Set<string>()
  const unique = data
    .filter((item) => { if (seen.has(item.url)) return false; seen.add(item.url); return true })
    .filter((item) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return item.headline.toLowerCase().includes(q) || (item.summary ?? '').toLowerCase().includes(q) || item.source.toLowerCase().includes(q)
    })

  return (
    <>
      {unique.map((item, i) => (
        <NewsCard key={`${item.url ?? item.id}-${i}`} item={item} index={i} />
      ))}
    </>
  )
}

export default function MarketNews() {
  const [category, setCategory] = useState<NewsCategory>('portfolio')
  const [search, setSearch]     = useState('')
  const [showSearch, setShowSearch] = useState(false)

  return (
    <View>
      {/* Título */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-white font-semibold text-base">Notícias do Mercado</Text>
        <TouchableOpacity onPress={() => { setShowSearch(!showSearch); setSearch('') }}>
          <Ionicons name={showSearch ? 'close-outline' : 'search-outline'} size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Barra de pesquisa */}
      {showSearch && (
        <View className="flex-row items-center bg-dark-800 rounded-xl px-3 py-2 mb-3 border border-dark-600">
          <Ionicons name="search-outline" size={15} color="#475569" />
          <TextInput
            className="flex-1 text-white text-sm ml-2"
            placeholder="Pesquisar notícias..."
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color="#475569" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Selector horizontal — scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingRight: 16 }}>
        <View className="flex-row gap-2">
          {NEWS_CATEGORIES.map((cat) => {
            const isActive = category === cat.key
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setCategory(cat.key)}
                className="flex-row items-center gap-1.5 rounded-full px-3.5 py-2 border"
                style={{
                  backgroundColor: isActive ? cat.color + '28' : '#1e293b',
                  borderColor:     isActive ? cat.color : '#334155',
                }}
              >
                <Text style={{ fontSize: 12 }}>{cat.icon}</Text>
                <Text
                  className="text-xs font-medium"
                  style={{ color: isActive ? cat.color : '#94a3b8' }}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Subtítulo da categoria activa */}
      {category === 'portfolio' && (
        <View className="flex-row items-center gap-1.5 mb-3">
          <View className="w-1.5 h-1.5 rounded-full bg-mint-500" />
          <Text className="text-dark-400 text-xs">Notícias dos teus ativos + ETF proxies</Text>
        </View>
      )}

      {/* Feed */}
      <NewsFeed category={category} search={search} />
    </View>
  )
}
