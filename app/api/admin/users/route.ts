/**
 * GET /api/admin/users — lista usuários com filtros
 * Restrito a admin e foguetim_support.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp      = new URL(req.url).searchParams
  const search  = sp.get('search')?.trim()  ?? ''
  const plan    = sp.get('plan')?.trim()    ?? ''
  const status  = sp.get('status')?.trim()  ?? ''
  const page    = Math.max(1, Number(sp.get('page')  ?? 1))
  const limit   = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 25)))
  const from    = (page - 1) * limit
  const to      = from + limit - 1

  const db = supabaseAdmin()

  let query = db
    .from('users')
    .select('id, name, email, plan, role, created_at, cancelled_at, document_number, document_type', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,document_number.ilike.%${search}%`
    )
  }
  if (plan)   query = query.eq('plan', plan)
  if (status === 'active')    query = query.is('cancelled_at', null)
  if (status === 'cancelled') query = query.not('cancelled_at', 'is', null)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = (data ?? []).map((u: { id: string }) => u.id)

  if (userIds.length === 0) {
    return NextResponse.json({ users: [], total: 0, page, limit, total_pages: 0 })
  }

  // Parallel queries for enrichment
  const [mlRes, shopeeRes, productsRes, authRes] = await Promise.all([
    db.from('marketplace_connections').select('user_id').in('user_id', userIds).eq('marketplace', 'mercadolibre').eq('connected', true),
    db.from('marketplace_connections').select('user_id').in('user_id', userIds).eq('marketplace', 'shopee').eq('connected', true),
    db.from('products').select('user_id').in('user_id', userIds),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])

  const mlSet     = new Set((mlRes.data ?? []).map((r: { user_id: string }) => r.user_id))
  const shopeeSet = new Set((shopeeRes.data ?? []).map((r: { user_id: string }) => r.user_id))

  // Build auth user map for last_sign_in_at + banned status
  const authMap = new Map<string, { last_sign_in_at: string | null; banned_until: string | null }>()
  if ('users' in authRes.data) {
    for (const au of authRes.data.users) {
      authMap.set(au.id, {
        last_sign_in_at: au.last_sign_in_at ?? null,
        banned_until: au.banned_until ?? null,
      })
    }
  }

  // Product counts per user
  const productCountMap = new Map<string, number>()
  if (Array.isArray(productsRes.data)) {
    for (const r of productsRes.data as { user_id: string }[]) {
      productCountMap.set(r.user_id, (productCountMap.get(r.user_id) ?? 0) + 1)
    }
  }

  const users = (data ?? []).map((u: Record<string, unknown>) => {
    const auth = authMap.get(u.id as string)
    return {
      ...u,
      ml_connected:     mlSet.has(u.id as string),
      shopee_connected: shopeeSet.has(u.id as string),
      products_count:   productCountMap.get(u.id as string) ?? 0,
      last_sign_in_at:  auth?.last_sign_in_at ?? null,
      banned_until:     auth?.banned_until ?? null,
    }
  })

  return NextResponse.json({
    users,
    total:       count ?? 0,
    page,
    limit,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
}
