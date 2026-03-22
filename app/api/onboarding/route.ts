/**
 * GET  /api/onboarding  — retorna estado de onboarding do usuário autenticado
 * PATCH /api/onboarding — atualiza current_step e/ou steps_completed
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('user_onboarding')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se ainda não existe registro, retorna estado inicial
  if (!data) {
    return NextResponse.json({
      user_id:         user.id,
      completed:       false,
      dismissed:       false,
      current_step:    0,
      steps_completed: {},
      started_at:      null,
    })
  }

  return NextResponse.json(data)
}

// ─── PATCH ─────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  const body = await req.json() as {
    current_step?: number
    steps_completed?: Record<string, boolean>
  }

  // Upsert — cria o registro se não existir
  const { data: existing } = await db
    .from('user_onboarding')
    .select('id, steps_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    // Primeiro acesso: insere registro
    const { error } = await db.from('user_onboarding').insert({
      user_id:         user.id,
      current_step:    body.current_step ?? 0,
      steps_completed: body.steps_completed ?? {},
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Merge steps_completed (não sobrescreve passos já concluídos)
  const merged = {
    ...(existing.steps_completed as Record<string, boolean>),
    ...(body.steps_completed ?? {}),
  }

  const update: Record<string, unknown> = { steps_completed: merged }
  if (body.current_step !== undefined) update.current_step = body.current_step

  const { error } = await db
    .from('user_onboarding')
    .update(update)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
