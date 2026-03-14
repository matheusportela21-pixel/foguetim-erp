/**
 * lib/supabase-admin.ts
 * Supabase admin client — usa SUPABASE_SERVICE_ROLE_KEY, bypassa RLS.
 * Use APENAS em código server-side (API routes, Server Actions).
 * NUNCA exponha esta chave no client-side.
 */
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !roleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. ' +
      'Adicione-a nas variáveis de ambiente do servidor (Vercel).'
    )
  }

  return createClient(url, roleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Admin client singleton — leitura lazy para garantir env vars no request-time */
export function supabaseAdmin() {
  return getAdminClient()
}
