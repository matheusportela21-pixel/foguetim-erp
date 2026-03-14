/**
 * POST /api/mercadolivre/callback
 * Receives the authorization code, exchanges for tokens, saves to DB.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exchangeCode, mlFetch, saveConnection } from '@/lib/mercadolivre'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  try {
    const tokens = await exchangeCode(code)

    // Fetch ML user info
    const me = await fetch(`https://api.mercadolibre.com/users/${tokens.user_id}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }).then(r => r.json())

    await saveConnection(user.id, tokens, me.nickname ?? String(tokens.user_id))

    return NextResponse.json({ success: true, nickname: me.nickname ?? String(tokens.user_id) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[ML callback]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
