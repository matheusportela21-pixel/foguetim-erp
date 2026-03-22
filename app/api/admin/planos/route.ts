/**
 * GET  /api/admin/planos — stats de planos + MRR estimado
 * PATCH /api/admin/planos — altera plano de um usuário
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-guard'

const PLAN_PRICES: Record<string, number> = {
  explorador:     0,
  piloto:         29.90,
  comandante:     49.90,
  almirante:      89.90,
  enterprise:     199.90,
  missao_espacial: 119.90,
}

const VALID_PLANS = Object.keys(PLAN_PRICES)

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  // Count users per plan
  const { data: users, error } = await supabaseAdmin()
    .from('users')
    .select('plan')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const counts: Record<string, number> = {}
  for (const p of VALID_PLANS) counts[p] = 0

  let total_users = 0
  for (const u of users ?? []) {
    const plan = u.plan ?? 'explorador'
    counts[plan] = (counts[plan] ?? 0) + 1
    total_users++
  }

  const plans = VALID_PLANS.map(p => ({
    plan: p,
    count: counts[p] ?? 0,
    price: PLAN_PRICES[p],
    subtotal: (counts[p] ?? 0) * PLAN_PRICES[p],
  }))

  const mrr = plans.reduce((sum, p) => sum + p.subtotal, 0)

  return NextResponse.json({
    plans,
    mrr,
    total_users,
    billing_active: false,
  })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const body = await req.json()
  const { userId, plan, reason } = body as { userId: string; plan: string; reason: string }

  if (!userId || !plan || !reason) {
    return NextResponse.json({ error: 'userId, plan e reason são obrigatórios' }, { status: 400 })
  }

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: `Plano inválido. Válidos: ${VALID_PLANS.join(', ')}` }, { status: 400 })
  }

  // Get current plan for logging
  const { data: current, error: fetchErr } = await supabaseAdmin()
    .from('users')
    .select('plan, name, email')
    .eq('id', userId)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Update plan
  const { data: updated, error: updateErr } = await supabaseAdmin()
    .from('users')
    .update({ plan })
    .eq('id', userId)
    .select()
    .single()

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Log activity
  await supabaseAdmin()
    .from('activity_logs')
    .insert({
      user_id: guard.userId,
      action: 'admin.user.change_plan',
      category: 'admin',
      description: `Plano alterado de "${current.plan}" para "${plan}" — ${reason}`,
      metadata: {
        target_user_id: userId,
        target_email: current.email,
        old_plan: current.plan,
        new_plan: plan,
        reason,
      },
    })

  return NextResponse.json({ user: updated })
}
