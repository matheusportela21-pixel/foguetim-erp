/**
 * GET /api/admin/stats
 * KPIs do dashboard admin — dados reais em tempo real.
 */
import { NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const db  = supabaseAdmin()
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 86400_000).toISOString()
  const d1  = new Date(now.getTime() -      86400_000).toISOString()
  const bom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    totalUsersRes,
    newTodayRes,
    newMonthRes,
    activeRes,
    planBreakdownRes,
    cancelMonthRes,
    mlConnectedRes,
    recentUsersRes,
    recentCancelsRes,
    openTicketsTodayRes,
    trialUsersRes,
    openTicketsRes,
  ] = await Promise.all([
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', d1),
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', bom),
    db.from('activity_logs').select('user_id').gte('created_at', d30).limit(5000),
    db.from('users').select('plan'),
    db.from('cancellation_requests').select('id', { count: 'exact', head: true }).gte('created_at', bom),
    db.from('marketplace_connections')
      .select('user_id', { count: 'exact', head: true })
      .eq('marketplace', 'mercadolibre')
      .eq('connected', true),
    db.from('users')
      .select('id, name, email, plan, role, created_at, cancelled_at')
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('cancellation_requests')
      .select('id, user_id, reason, details, created_at, users(name, email)')
      .order('created_at', { ascending: false })
      .limit(5),
    // Tickets abertos hoje (tabela pode não existir)
    Promise.resolve(
      db.from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .gte('created_at', d1)
    ).catch(() => ({ count: 0 })),
    // Contas trial (explorador plan)
    db.from('users')
      .select('id', { count: 'exact', head: true })
      .eq('plan', 'explorador')
      .is('cancelled_at', null),
    // Total tickets abertos
    Promise.resolve(
      db.from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])
    ).catch(() => ({ count: 0 })),
  ])

  const activeSet = new Set(
    (activeRes.data ?? []).map((r: { user_id: string }) => r.user_id)
  )

  const planMap: Record<string, number> = {}
  for (const u of (planBreakdownRes.data ?? [])) {
    const p = (u as { plan: string }).plan ?? 'explorador'
    planMap[p] = (planMap[p] ?? 0) + 1
  }

  const total       = totalUsersRes.count ?? 0
  const cancelMonth = cancelMonthRes.count ?? 0
  const cancelRate  = total > 0 ? Math.round((cancelMonth / total) * 100 * 10) / 10 : 0
  const mlConnected = mlConnectedRes.count ?? 0

  return NextResponse.json({
    users: {
      total,
      active_30d:   activeSet.size,
      new_today:    newTodayRes.count ?? 0,
      new_month:    newMonthRes.count ?? 0,
      trial:        trialUsersRes.count ?? 0,
    },
    plans: planMap,
    health: {
      cancel_month:    cancelMonth,
      cancel_rate_pct: cancelRate,
      ml_connected:    mlConnected,
      no_integration:  total - mlConnected,
      open_tickets:    (openTicketsRes as { count?: number }).count ?? 0,
      tickets_today:   (openTicketsTodayRes as { count?: number }).count ?? 0,
    },
    recent_users:   recentUsersRes.data   ?? [],
    recent_cancels: recentCancelsRes.data ?? [],
  })
}
