/**
 * GET  /api/admin/users/[id] — detalhes completos de um usuário
 * PATCH /api/admin/users/[id] — alterar plan, role ou status
 * Restrito a admin e foguetim_support.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }      from '@/lib/admin-guard'
import { supabaseAdmin }     from '@/lib/supabase-admin'
import { logAdminAction }    from '@/lib/admin-logger'

type Params = { params: { id: string } }

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const { id } = params
  const db     = supabaseAdmin()

  const [userRes, mlRes, logsRes, notifsRes, cancelRes] = await Promise.all([
    db.from('users')
      .select('*')
      .eq('id', id)
      .single(),
    db.from('marketplace_connections')
      .select('marketplace, connected, ml_nickname, created_at')
      .eq('user_id', id),
    db.from('activity_logs')
      .select('action, category, description, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('notifications')
      .select('title, type, read, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('cancellation_requests')
      .select('reason, details, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (userRes.error || !userRes.data) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    user:          userRes.data,
    integrations:  mlRes.data    ?? [],
    activity:      logsRes.data  ?? [],
    notifications: notifsRes.data ?? [],
    cancellations: cancelRes.data ?? [],
  })
}

/* ── PATCH ───────────────────────────────────────────────────────────────── */
interface PatchBody {
  plan?:        string
  role?:        string
  suspended?:   boolean
  reason?:      string
}

const ALLOWED_PLANS  = ['explorador', 'piloto', 'comandante', 'almirante', 'enterprise']
const ALLOWED_ROLES  = ['operador', 'supervisor', 'analista_produtos', 'analista_financeiro', 'suporte', 'diretor', 'admin', 'foguetim_support']

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const { id } = params
  let body: PatchBody
  try {
    body = await req.json() as PatchBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  const details: Record<string, unknown> = {}

  if (body.plan !== undefined) {
    if (!ALLOWED_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
    }
    patch.plan   = body.plan
    details.plan = body.plan
  }

  if (body.role !== undefined) {
    if (!ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
    }
    patch.role   = body.role
    details.role = body.role
  }

  if (body.suspended === true) {
    patch.cancelled_at = new Date().toISOString()
    details.action = 'suspended'
  } else if (body.suspended === false) {
    patch.cancelled_at = null
    details.action = 'reactivated'
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { error: updateError } = await db
    .from('users')
    .update(patch)
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Registrar no audit log (non-fatal)
  void db.from('admin_actions').insert({
    admin_id:       guard.userId,
    action:         body.plan ? 'change_plan' : body.role ? 'change_role' : 'change_status',
    target_user_id: id,
    details:        { ...details, reason: body.reason ?? null },
  })

  // Registrar em activity_logs com visibilidade admin
  const actionLabel = body.plan ? `Plano alterado para ${body.plan}` : body.role ? `Cargo alterado para ${body.role}` : details.action === 'suspended' ? 'Conta suspensa' : 'Conta reativada'
  if (guard.userId) {
    void logAdminAction({
      userId:      guard.userId,
      action:      body.plan ? 'admin.user.change_plan' : body.role ? 'admin.user.change_role' : 'admin.user.change_status',
      category:    'admin',
      description: `[Admin] ${actionLabel} — usuário ${id}`,
      metadata:    { ...details, reason: body.reason ?? null, target_user_id: id },
    })
  }

  return NextResponse.json({ ok: true })
}
