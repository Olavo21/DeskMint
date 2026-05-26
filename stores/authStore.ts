import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { DmProfile } from '../types/database'

interface AuthStore {
  session: Session | null
  profile: DmProfile | null
  loading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: DmProfile | null) => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}))
