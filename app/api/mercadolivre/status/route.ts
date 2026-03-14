/**
 * GET /api/mercadolivre/status
 * Returns the current ML connection status for the authenticated user.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getMLConnection } from '@/lib/mercadolivre'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected:   true,
    nickname:    conn.ml_nickname,
    ml_user_id:  conn.ml_user_id,
    expires_at:  conn.expires_at,
  })
}
