'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isConfigured } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id:         string
  email:      string
  name:       string
  role:       string
  company:    string
  cnpj:       string
  plan:       string
  avatar_url: string | null
}

interface AuthContextType {
  user:    User | null
  profile: Profile | null
  loading: boolean
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  signUp:  (email: string, password: string, name: string, company: string) => Promise<{ error: string | null }>
}

// ─── Mock profile (used when Supabase is not yet configured) ──────────────────

const MOCK_PROFILE: Profile = {
  id:         'dev-user',
  email:      'matheus.portela21@gmail.com',
  name:       'Matheus Portela',
  role:       'diretor',
  company:    'Foguetim',
  cnpj:       '',
  plan:       'comandante',
  avatar_url: null,
}

const MOCK_USER = { id: 'dev-user', email: 'matheus.portela21@gmail.com' } as unknown as User

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true,
  signIn:  async () => ({ error: null }),
  signOut: async () => {},
  signUp:  async () => ({ error: null }),
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // If Supabase not configured → use mock profile so the app works in dev
  if (!isConfigured()) {
    return (
      <AuthContext.Provider value={{
        user:    MOCK_USER,
        profile: MOCK_PROFILE,
        loading: false,
        signIn:  async () => ({ error: null }),
        signOut: async () => {},
        signUp:  async () => ({ error: null }),
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data as Profile)
  }, [])

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const signUp = async (email: string, password: string, name: string, company: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, company } },
    })
    if (error) return { error: error.message }

    // Insert profile (the DB trigger also does this, but we do it here to set name/company)
    if (data.user) {
      await supabase.from('users').upsert({
        id:      data.user.id,
        email,
        name,
        company,
        role:    'operador',
        plan:    'explorador',
      })
    }
    return { error: null }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
