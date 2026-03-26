/**
 * GET /api/admin/cancelamentos
 * List cancellation_requests with pagination and date range filters.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const url    = new URL(req.url)
  const limit  = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(url.searchParams.get('offset') ?? '0')
  const range  = url.searchParams.get('range') ?? 'all' // 7d, 30d, 90d, all

  const db = supabaseAdmin()

  // Build date filter
  let dateFrom: string | null = null
  if (range !== 'all') {
    const days = parseInt(range) || 30
    dateFrom = new Date(Date.now() - days * 86400_000).toISOString()
  }

  // Fetch cancellation_requests with user join
  let query = db
    .from('cancellation_requests')
    .select('id, user_id, reason, details, created_at, users!inner(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Stats: total all-time
  const { count: totalAll } = await db
    .from('cancellation_requests')
    .select('id', { count: 'exact', head: true })

  // Stats: this month
  const bom = new Date()
  bom.setDate(1)
  bom.setHours(0, 0, 0, 0)
  const { count: thisMonth } = await db
    .from('cancellation_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', bom.toISOString())

  // Stats: reactivated (users who cancelled then got status changed back)
  const { count: reactivated } = await db
    .from('cancellation_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'reactivated')

  // Stats: top reason
  const { data: allReasons } = await db
    .from('cancellation_requests')
    .select('reason')

  const reasonCounts: Record<string, number> = {}
  for (const r of allReasons ?? []) {
    reasonCounts[r.reason] = (reasonCounts[r.reason] ?? 0) + 1
  }
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] ?? null

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    stats: {
      totalAll: totalAll ?? 0,
      thisMonth: thisMonth ?? 0,
      reactivated: reactivated ?? 0,
      topReason: topReason ? topReason[0] : null,
    },
  })
}
