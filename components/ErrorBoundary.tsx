import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'

// Ecrã amigável mostrado quando um erro de rendering escapa até aqui.
// Sentry.ErrorBoundary já reporta o erro sozinho (mesmo pipeline do
// Sentry.init em lib/sentry.ts) — este componente só define o fallback.
function Fallback({ resetError }: { error: unknown; componentStack: string; eventId: string; resetError: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ef444420', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
      </View>
      <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
        Algo correu mal
      </Text>
      <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
        A DeskMint encontrou um erro inesperado. Já foi reportado
        automaticamente — podes tentar continuar.
      </Text>
      <TouchableOpacity
        onPress={resetError}
        style={{ backgroundColor: '#14b8a6', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14 }}
      >
        <Text style={{ color: 'white', fontSize: 15, fontWeight: '700' }}>Tentar novamente</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <Sentry.ErrorBoundary fallback={Fallback}>
      {children}
    </Sentry.ErrorBoundary>
  )
}
