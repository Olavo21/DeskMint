import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { Alert } from 'react-native'

function notifyError(label: string, error: unknown) {
  console.error(`[queryClient:${label}]`, error)
  Alert.alert(
    'Falha de ligação',
    'Não foi possível sincronizar os teus dados. Verifica a tua ligação à internet.'
  )
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.state.data !== undefined) return // já há dados válidos em cache, falha silenciosa em fundo
      notifyError(String(query.queryKey[0] ?? 'query'), error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return // já tratado localmente pelo hook
      notifyError('mutation', error)
    },
  }),
})
