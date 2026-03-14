/**
 * lib/admin-guard.ts
 * Helper para verificar permissão de admin nas rotas API.
 */
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type AdminRole = 'admin' | 'foguetim_support'

export interface AdminCheckResult {
  ok:      boolean
  userId?: string
  role?:   AdminRole
  error?:  string
  status?: number
}

export async function requireAdmin(): Promise<AdminCheckResult> {
  const user = await getAuthUser()
  if (!user) return { ok: false, error: 'Unauthorized', status: 401 }

  const { data: profile, error } = await supabaseAdmin()
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }

  const isAdmin = profile.role === 'admin' || profile.role === 'foguetim_support'
  if (!isAdmin) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }

  return { ok: true, userId: user.id, role: profile.role as AdminRole }
}
