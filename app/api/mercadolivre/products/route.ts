/**
 * GET  /api/mercadolivre/products  — list seller's ML items
 * POST /api/mercadolivre/products  — create a new ML item
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { mlFetch, getMLConnection } from '@/lib/mercadolivre'

function serverSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}

export async function GET(req: NextRequest) {
  const supabase = serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ error: 'ML not connected' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const offset = searchParams.get('offset') ?? '0'
  const limit  = searchParams.get('limit')  ?? '50'

  try {
    const data = await mlFetch(user.id,
      `/users/${conn.ml_user_id}/items/search?offset=${offset}&limit=${limit}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  try {
    const data = await mlFetch(user.id, '/items', { method: 'POST', body: JSON.stringify(body) })
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
