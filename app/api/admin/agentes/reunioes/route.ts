/**
 * GET /api/admin/agentes/reunioes — lista reuniões com filtros e paginação
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp     = req.nextUrl.searchParams
  const page   = Math.max(1, Number(sp.get('page')  ?? 1))
  const limit  = Math.min(50, Number(sp.get('limit') ?? 20))
  const status = sp.get('status') ?? ''
  const after  = sp.get('after')  ?? ''
  const before = sp.get('before') ?? ''
  const from   = (page - 1) * limit
  const to     = from + limit - 1

  const db = supabaseAdmin()

  let query = db
    .from('ai_agent_meetings')
    .select('id, titulo, status, participantes, report_ids, resumo_executivo, decisoes, created_at, custo_usd, tokens_input, tokens_output, tempo_execucao_ms', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (after)  query = query.gte('created_at', after)
  if (before) query = query.lte('created_at', before)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Compute per-meeting derived fields
  const meetings = (data ?? []).map((m: Record<string, unknown>) => {
    const decisoes = (m.decisoes as Array<{ severidade?: string }> | null) ?? []
    const sevPriority = ['critica', 'alta', 'media', 'baixa']
    let severidade_max = 'baixa'
    for (const sev of sevPriority) {
      if (decisoes.some(d => (d.severidade ?? '').toLowerCase() === sev)) { severidade_max = sev; break }
    }
    return {
      ...m,
      num_participantes: Array.isArray(m.participantes) ? (m.participantes as unknown[]).length : 0,
      num_report_ids:    Array.isArray(m.report_ids)    ? (m.report_ids    as unknown[]).length : 0,
      severidade_max,
    }
  })

  return NextResponse.json({ reunioes: meetings, total: count ?? 0, page, limit })
}
