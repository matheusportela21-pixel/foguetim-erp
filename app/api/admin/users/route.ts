/**
 * GET /api/admin/users — lista usuários com filtros
 * Restrito a admin e foguetim_support.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const sp      = new URL(req.url).searchParams
  const search  = sp.get('search')?.trim()  ?? ''
  const plan    = sp.get('plan')?.trim()    ?? ''
  const status  = sp.get('status')?.trim()  ?? ''   // 'active' | 'cancelled'
  const page    = Math.max(1, Number(sp.get('page')  ?? 1))
  const limit   = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 25)))
  const from    = (page - 1) * limit
  const to      = from + limit - 1

  let query = supabaseAdmin()
    .from('users')
    .select('id, name, email, plan, role, created_at, cancelled_at, document_number, document_type', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,document_number.ilike.%${search}%`
    )
  }
  if (plan) {
    query = query.eq('plan', plan)
  }
  if (status === 'active') {
    query = query.is('cancelled_at', null)
  } else if (status === 'cancelled') {
    query = query.not('cancelled_at', 'is', null)
  }

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch ML connections for these users
  const userIds = (data ?? []).map((u: { id: string }) => u.id)
  let mlSet = new Set<string>()
  if (userIds.length > 0) {
    const { data: mlData } = await supabaseAdmin()
      .from('marketplace_connections')
      .select('user_id')
      .in('user_id', userIds)
      .eq('marketplace', 'mercadolibre')
      .eq('connected', true)
    mlSet = new Set((mlData ?? []).map((r: { user_id: string }) => r.user_id))
  }

  const users = (data ?? []).map((u: Record<string, unknown>) => ({
    ...u,
    ml_connected: mlSet.has(u.id as string),
  }))

  return NextResponse.json({
    users,
    total:       count ?? 0,
    page,
    limit,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
}
