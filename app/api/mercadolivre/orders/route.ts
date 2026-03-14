/**
 * GET /api/mercadolivre/orders
 * Fetch seller's ML orders (recent by default).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mlFetch, getMLConnection } from '@/lib/mercadolivre'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ error: 'ML not connected' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const offset = searchParams.get('offset') ?? '0'
  const limit  = searchParams.get('limit')  ?? '50'
  const sort   = searchParams.get('sort')   ?? 'date_desc'

  try {
    const data = await mlFetch(user.id,
      `/orders/search?seller=${conn.ml_user_id}&sort=${sort}&offset=${offset}&limit=${limit}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
