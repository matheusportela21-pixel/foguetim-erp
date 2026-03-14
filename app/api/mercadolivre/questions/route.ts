/**
 * GET  /api/mercadolivre/questions  — fetch unanswered questions
 * POST /api/mercadolivre/questions  — answer a question
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

  const status = new URL(req.url).searchParams.get('status') ?? 'UNANSWERED'
  try {
    const data = await mlFetch(user.id,
      `/questions/search?seller_id=${conn.ml_user_id}&status=${status}&sort_fields=date_created&sort_types=DESC`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = serverSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question_id, text } = await req.json()
  if (!question_id || !text) {
    return NextResponse.json({ error: 'question_id and text required' }, { status: 400 })
  }

  try {
    const data = await mlFetch(user.id, `/answers`, {
      method: 'POST',
      body: JSON.stringify({ question_id, text }),
    })
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
