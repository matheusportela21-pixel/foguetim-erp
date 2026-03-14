/**
 * GET /api/customers
 * Lista clientes com filtros, busca e paginação.
 *
 * Query params:
 *   search  — nickname, nome ou email (parcial)
 *   tag     — filtra por tag exata (ex: VIP)
 *   sort    — total_spent | total_orders | last_order_date (padrão)
 *   order   — asc | desc (padrão: desc)
 *   page    — página (padrão: 1)
 *   limit   — itens por página (padrão: 20, máx: 100)
 *   vip     — "true" para só VIPs
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

type SortField = 'total_spent' | 'total_orders' | 'last_order_date'

const ALLOWED_SORTS: SortField[] = ['total_spent', 'total_orders', 'last_order_date']

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const search = sp.get('search')?.trim() ?? ''
  const tag    = sp.get('tag')?.trim()    ?? ''
  const vip    = sp.get('vip') === 'true'
  const rawSort = (sp.get('sort') ?? 'last_order_date') as SortField
  const sort   = ALLOWED_SORTS.includes(rawSort) ? rawSort : 'last_order_date'
  const order  = sp.get('order') === 'asc' ? false : true   // ascending = false means DESC
  const page   = Math.max(1, Number(sp.get('page')  ?? 1))
  const limit  = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20)))
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  let query = supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order(sort, { ascending: !order })
    .range(from, to)

  if (search) {
    query = query.or(
      `nickname.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  if (vip) {
    query = query.eq('is_vip', true)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    customers:   data ?? [],
    total:       count ?? 0,
    page,
    limit,
    total_pages: Math.ceil((count ?? 0) / limit),
  })
}
