let _AsyncStorage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } | null = null
try {
  _AsyncStorage = require('@react-native-async-storage/async-storage').default
} catch {}

const TICKER_BAR_KEY = '@deskmint_ticker_bar_enabled'

export const getSavedTickerBarEnabled = async (): Promise<boolean> => {
  try {
    if (!_AsyncStorage) return true
    const saved = await _AsyncStorage.getItem(TICKER_BAR_KEY)
    if (saved === '0') return false
    if (saved === '1') return true
  } catch {}
  return true
}

export const saveTickerBarEnabled = async (enabled: boolean): Promise<void> => {
  try {
    if (_AsyncStorage) await _AsyncStorage.setItem(TICKER_BAR_KEY, enabled ? '1' : '0')
  } catch (e) {
    console.error('saveTickerBarEnabled error', e)
  }
}
