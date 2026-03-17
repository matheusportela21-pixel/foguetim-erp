/**
 * GET /api/admin/webhooks
 * Lista webhooks da fila para o painel admin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const { searchParams } = req.nextUrl
  const topic  = searchParams.get('topic')  ?? ''
  const status = searchParams.get('status') ?? ''
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit  = 50
  const offset = (page - 1) * limit

  const db = supabaseAdmin()

  // KPIs
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalTodayRes, pendingRes, errorRes, listRes] = await Promise.all([
    db.from('webhook_queue')
      .select('id', { count: 'exact', head: true })
      .gte('received_at', today.toISOString()),
    db.from('webhook_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    db.from('webhook_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'error'),
    (() => {
      let q = db
        .from('webhook_queue')
        .select('id, topic, resource, user_id, status, attempts, received_at, error_message', { count: 'exact' })
        .order('received_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (topic)  q = q.eq('topic', topic)
      if (status) q = q.eq('status', status)

      return q
    })(),
  ])

  // Handle missing table gracefully
  if (listRes.error?.code === '42P01') {
    return NextResponse.json({
      webhooks: [],
      total: 0,
      kpis: { today: 0, pending: 0, errors: 0 },
    })
  }

  return NextResponse.json({
    webhooks: listRes.data ?? [],
    total:    listRes.count ?? 0,
    kpis: {
      today:   totalTodayRes.count ?? 0,
      pending: pendingRes.count    ?? 0,
      errors:  errorRes.count      ?? 0,
    },
  })
}
