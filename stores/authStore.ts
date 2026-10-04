import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import type { DmProfile } from '../types/database'

interface AuthStore {
  session: Session | null
  profile: DmProfile | null
  loading: boolean
  // true enquanto decorre a recuperação de password: o _layout não encaminha. Só em
  // memória e a false no arranque, de propósito — persistida, uma flag presa
  // deixaria a pessoa fechada fora da app.
  recovering: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: DmProfile | null) => void
  setLoading: (v: boolean) => void
  setRecovering: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  profile: null,
  loading: true,
  recovering: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setRecovering: (recovering) => set({ recovering }),
}))
