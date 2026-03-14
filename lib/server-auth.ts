/**
 * lib/server-auth.ts
 * Helpers para autenticação server-side em API routes.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function serverSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}

export async function getAuthUser() {
  const { data: { user } } = await serverSupabase().auth.getUser()
  return user
}
