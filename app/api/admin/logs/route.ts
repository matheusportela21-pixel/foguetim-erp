/**
 * GET /api/admin/logs — list activity_logs (admin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const { searchParams } = req.nextUrl
  const limit    = Number(searchParams.get('limit')    ?? '50')
  const offset   = Number(searchParams.get('offset')   ?? '0')
  const userId   = searchParams.get('user_id')
  const category = searchParams.get('category')
  const search   = searchParams.get('search')

  try {
    let query = supabaseAdmin()
      .from('activity_logs')
      .select(`
        *,
        user:user_id(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId)   query = query.eq('user_id', userId)
    if (category) query = query.eq('category', category)
    if (search)   query = query.ilike('description', `%${search}%`)

    const { data, count, error } = await query

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ logs: [], total: 0 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
