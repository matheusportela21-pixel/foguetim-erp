/**
 * GET /api/admin/agentes — lista todos os agentes com status do último run
 */
import { NextResponse }  from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()

  const { data: agents, error } = await db
    .from('ai_agents')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Para cada agente, buscar último run e último relatório
  const enriched = await Promise.all((agents ?? []).map(async agent => {
    const [runRes, reportRes] = await Promise.all([
      db.from('ai_agent_runs')
        .select('status, started_at, finished_at, custo_usd')
        .eq('agent_id', agent.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single(),
      db.from('ai_agent_reports')
        .select('severidade_max, status, created_at')
        .eq('agent_id', agent.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    return {
      ...agent,
      ultimo_run:      runRes.data    ?? null,
      ultimo_relatorio: reportRes.data ?? null,
    }
  }))

  return NextResponse.json({ agents: enriched })
}
