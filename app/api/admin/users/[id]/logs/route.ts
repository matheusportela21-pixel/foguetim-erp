/**
 * GET /api/admin/users/[id]/logs — user activity logs
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20')

  try {
    const { data, error } = await supabaseAdmin()
      .from('activity_logs')
      .select('*')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ logs: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
