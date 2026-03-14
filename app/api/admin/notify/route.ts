/**
 * POST /api/admin/notify — enviar notificação para grupo de usuários
 * GET  /api/admin/notify — histórico de notificações admin enviadas
 * Restrito a admin e foguetim_support.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

type NotifType     = 'info' | 'warning' | 'error' | 'success'
type NotifCategory = 'system' | 'orders' | 'claims' | 'products' | 'financial' | 'integration'

interface PostBody {
  target:     'all' | 'plan' | 'user'
  plan?:      string        // quando target = 'plan'
  user_id?:   string        // quando target = 'user'
  title:      string
  message:    string
  type?:      NotifType
  category?:  NotifCategory
  action_url?: string
}

/* ── POST ────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  let body: PostBody
  try {
    body = await req.json() as PostBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.title?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: 'title e message são obrigatórios' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Resolve target user IDs
  let userIds: string[] = []

  if (body.target === 'all') {
    const { data } = await db.from('users').select('id').is('cancelled_at', null)
    userIds = (data ?? []).map((u: { id: string }) => u.id)
  } else if (body.target === 'plan' && body.plan) {
    const { data } = await db.from('users').select('id').eq('plan', body.plan).is('cancelled_at', null)
    userIds = (data ?? []).map((u: { id: string }) => u.id)
  } else if (body.target === 'user' && body.user_id) {
    userIds = [body.user_id]
  }

  if (userIds.length === 0) {
    return NextResponse.json({ error: 'Nenhum destinatário encontrado' }, { status: 400 })
  }

  const rows = userIds.map(uid => ({
    user_id:    uid,
    title:      body.title,
    message:    body.message,
    type:       body.type     ?? 'info',
    category:   body.category ?? 'system',
    action_url: body.action_url ?? null,
  }))

  // Insert in batches of 500
  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('notifications').insert(rows.slice(i, i + BATCH))
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    inserted += Math.min(BATCH, rows.length - i)
  }

  // Audit log
  await db.from('admin_actions').insert({
    admin_id: guard.userId,
    action:   'send_notification',
    details:  {
      title:    body.title,
      target:   body.target,
      plan:     body.plan    ?? null,
      user_id:  body.user_id ?? null,
      count:    inserted,
    },
  })

  return NextResponse.json({ ok: true, sent: inserted })
}

/* ── GET — histórico ─────────────────────────────────────────────────────── */
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const { data, error } = await supabaseAdmin()
    .from('admin_actions')
    .select('id, admin_id, details, created_at, users!admin_actions_admin_id_fkey(name, email)')
    .eq('action', 'send_notification')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ history: data ?? [] })
}
