/**
 * GET /api/admin/agentes/reunioes — lista reuniões do Coordenador
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp    = req.nextUrl.searchParams
  const page  = Math.max(1, Number(sp.get('page') ?? 1))
  const limit = Math.min(20, Number(sp.get('limit') ?? 10))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  const { data, count, error } = await supabaseAdmin()
    .from('ai_agent_meetings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meetings: data ?? [], total: count ?? 0 })
}
