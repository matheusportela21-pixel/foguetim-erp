/**
 * GET  /api/notifications  — lista as últimas 20 notificações + unread_count
 * PATCH /api/notifications  — marca como lida(s): { id } ou { all: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const db = supabaseAdmin()

  const [listRes, countRes] = await Promise.all([
    db
      .from('notifications')
      .select('id, title, message, type, category, read, action_url, created_at')
      .eq('user_id', dataOwnerId)
      .order('created_at', { ascending: false })
      .limit(20),

    db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', dataOwnerId)
      .eq('read', false),
  ])

  if (listRes.error) {
    return NextResponse.json({ error: listRes.error.message }, { status: 500 })
  }

  return NextResponse.json({
    notifications: listRes.data ?? [],
    unread_count:  countRes.count ?? 0,
  })
}

/* ── PATCH ───────────────────────────────────────────────────────────────── */
interface PatchBody {
  id?:  string
  all?: boolean
}

export async function PATCH(req: NextRequest) {
  const { dataOwnerId, error: authErr } = await resolveDataOwner()
  if (authErr) return authErr

  let body: PatchBody
  try {
    body = await req.json() as PatchBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const db = supabaseAdmin()

  if (body.all === true) {
    const { error } = await db
      .from('notifications')
      .update({ read: true })
      .eq('user_id', dataOwnerId)
      .eq('read', false)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.id) {
    const { error } = await db
      .from('notifications')
      .update({ read: true })
      .eq('id', body.id)
      .eq('user_id', dataOwnerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Informe id ou all: true' }, { status: 400 })
}
