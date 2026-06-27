import { Alert, Platform } from 'react-native'

// Alert.alert com múltiplos botões é um no-op no react-native-web
// (static alert() {} — não mostra nada e o onPress nunca dispara).
// Em Web usa window.confirm; em iOS/Android mantém o Alert nativo.
export function confirmDestructive(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ])
}
