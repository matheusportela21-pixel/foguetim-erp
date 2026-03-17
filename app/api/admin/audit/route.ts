/**
 * GET /api/admin/audit — list admin audit logs
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const { searchParams } = req.nextUrl
  const limit  = Number(searchParams.get('limit')  ?? '20')
  const offset = Number(searchParams.get('offset') ?? '0')

  try {
    const { data, count, error } = await supabaseAdmin()
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ logs: [], total: 0 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
