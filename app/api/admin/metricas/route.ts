/**
 * GET /api/admin/metricas
 * Metricas detalhadas do sistema — usuarios, conexoes, crescimento, logins.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-guard'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const db  = supabaseAdmin()
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 86400_000).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // -- Parallel queries --
  const [
    totalUsersRes,
    newTodayRes,
    activeLogsRes,
    mlRes,
    shopeeRes,
    productsRes,
    ordersRes,
    growthRes,
    recentLoginsRes,
    planRes,
    loginsTodayRes,
  ] = await Promise.all([
    // users.total
    db.from('users').select('id', { count: 'exact', head: true }),

    // users.newToday
    db.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),

    // users.active30d — distinct user_ids from activity_logs
    db.from('activity_logs').select('user_id').gte('created_at', d30).limit(10000),

    // connections.ml
    db.from('marketplace_connections')
      .select('id', { count: 'exact', head: true })
      .eq('marketplace', 'mercadolivre')
      .eq('connected', true),

    // connections.shopee
    db.from('marketplace_connections')
      .select('id', { count: 'exact', head: true })
      .eq('marketplace', 'shopee')
      .eq('connected', true),

    // products
    db.from('warehouse_products').select('id', { count: 'exact', head: true }),

    // orders30d (may not exist)
    db.from('marketplace_orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', d30),

    // growth — new users per day last 30 days
    db.from('users')
      .select('created_at')
      .gte('created_at', d30)
      .order('created_at', { ascending: true }),

    // recentLogins — last 20 login activity_logs with user info
    db.from('activity_logs')
      .select('user_id, created_at, metadata, users(name, email)')
      .eq('action', 'login')
      .order('created_at', { ascending: false })
      .limit(20),

    // planDistribution
    db.from('users').select('plan'),

    // logins today count
    db.from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'login')
      .gte('created_at', todayStart),
  ])

  // -- active30d: distinct user_ids --
  const activeSet = new Set(
    (activeLogsRes.data ?? []).map((r: { user_id: string }) => r.user_id)
  )

  // -- growth: aggregate by date --
  const growthMap: Record<string, number> = {}
  for (const row of (growthRes.data ?? []) as { created_at: string }[]) {
    const date = row.created_at.slice(0, 10)
    growthMap[date] = (growthMap[date] ?? 0) + 1
  }
  // Fill missing days with 0
  const growth: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000)
    const key = d.toISOString().slice(0, 10)
    growth.push({ date: key, count: growthMap[key] ?? 0 })
  }

  // -- plan distribution --
  const planMap: Record<string, number> = {}
  for (const u of (planRes.data ?? []) as { plan: string }[]) {
    const p = u.plan ?? 'explorador'
    planMap[p] = (planMap[p] ?? 0) + 1
  }
  const planDistribution = Object.entries(planMap).map(([plan, count]) => ({ plan, count }))

  // -- recent logins --
  const recentLogins = (recentLoginsRes.data ?? []).map((row: Record<string, unknown>) => {
    const user = row.users as { name: string; email: string } | null
    const meta = row.metadata as { ip?: string } | null
    return {
      userId:    row.user_id,
      name:      user?.name ?? '—',
      email:     user?.email ?? '—',
      createdAt: row.created_at,
      ip:        meta?.ip ?? '—',
    }
  })

  return NextResponse.json({
    users: {
      total:    totalUsersRes.count ?? 0,
      active30d: activeSet.size,
      newToday: newTodayRes.count ?? 0,
    },
    connections: {
      ml:     mlRes.count ?? 0,
      shopee: shopeeRes.count ?? 0,
    },
    products:    productsRes.count ?? 0,
    orders30d:   (ordersRes as { count?: number }).count ?? 0,
    loginsToday: loginsTodayRes.count ?? 0,
    growth,
    recentLogins,
    planDistribution,
  })
}
