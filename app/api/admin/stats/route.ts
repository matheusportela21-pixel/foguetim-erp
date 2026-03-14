/**
 * GET /api/admin/stats
 * Métricas do SaaS para o dashboard admin.
 * Restrito a admin e foguetim_support.
 */
import { NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const db   = supabaseAdmin()
  const now  = new Date()
  const d30  = new Date(now.getTime() - 30 * 86400_000).toISOString()
  const d1   = new Date(now.getTime() -      86400_000).toISOString()
  const bom  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

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
  ] = await Promise.all([
    // total users
    db.from('users').select('id', { count: 'exact', head: true }),
    // new today
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', d1),
    // new this month
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', bom),
    // active last 30d via activity_logs
    db.from('activity_logs').select('user_id').gte('created_at', d30).limit(5000),
    // plan breakdown
    db.from('users').select('plan'),
    // cancellations this month
    db.from('cancellation_requests').select('id', { count: 'exact', head: true }).gte('created_at', bom),
    // ML connected
    db.from('marketplace_connections')
      .select('user_id', { count: 'exact', head: true })
      .eq('marketplace', 'mercadolibre')
      .eq('connected', true),
    // recent users
    db.from('users')
      .select('id, name, email, plan, role, created_at, cancelled_at')
      .order('created_at', { ascending: false })
      .limit(10),
    // recent cancellations
    db.from('cancellation_requests')
      .select('id, user_id, reason, details, created_at, users(name, email)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Active users: unique user_ids in activity_logs last 30d
  const activeSet = new Set(
    (activeRes.data ?? []).map((r: { user_id: string }) => r.user_id)
  )

  // Plan breakdown
  const planMap: Record<string, number> = {}
  for (const u of (planBreakdownRes.data ?? [])) {
    const p = (u as { plan: string }).plan ?? 'explorador'
    planMap[p] = (planMap[p] ?? 0) + 1
  }

  const total         = totalUsersRes.count    ?? 0
  const cancelMonth   = cancelMonthRes.count   ?? 0
  const cancelRate    = total > 0 ? Math.round((cancelMonth / total) * 100 * 10) / 10 : 0
  const mlConnected   = mlConnectedRes.count   ?? 0

  return NextResponse.json({
    users: {
      total,
      active_30d: activeSet.size,
      new_today:  newTodayRes.count  ?? 0,
      new_month:  newMonthRes.count  ?? 0,
    },
    plans: planMap,
    health: {
      cancel_month:    cancelMonth,
      cancel_rate_pct: cancelRate,
      ml_connected:    mlConnected,
      no_integration:  total - mlConnected,
    },
    recent_users:    recentUsersRes.data    ?? [],
    recent_cancels:  recentCancelsRes.data  ?? [],
  })
}
