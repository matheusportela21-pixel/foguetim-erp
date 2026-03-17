/**
 * GET  /api/promocoes/planos       — buscar todos os planos do usuário
 * PUT  /api/promocoes/planos       — criar ou atualizar um plano (upsert por event_id)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()                        { return (cookieStore as Awaited<typeof cookieStore>).getAll?.() ?? [] },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { (cookieStore as Awaited<typeof cookieStore>).set?.(name, value, options) } catch { /* readonly context */ }
          })
        },
      },
    }
  )
}

/* ── GET ─────────────────────────────────────────────────────────────── */

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeSupabase()

  const { data, error } = await supabase
    .from('promotion_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('event_id')

  if (error) {
    console.error('[promotion_plans GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plans: data ?? [] })
}

/* ── PUT ─────────────────────────────────────────────────────────────── */

interface PlanBody {
  event_id:  string
  status?:   'sem_planejamento' | 'em_preparacao' | 'pronto'
  notes?:    string
  checklist?: { label: string; checked: boolean }[]
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: PlanBody
  try {
    body = await req.json() as PlanBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.event_id) {
    return NextResponse.json({ error: 'event_id is required' }, { status: 400 })
  }

  const supabase = makeSupabase()

  const { data, error } = await supabase
    .from('promotion_plans')
    .upsert(
      {
        user_id:   user.id,
        event_id:  body.event_id,
        status:    body.status    ?? 'sem_planejamento',
        notes:     body.notes     ?? null,
        checklist: body.checklist ?? [],
      },
      { onConflict: 'user_id,event_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[promotion_plans PUT]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ plan: data })
}
