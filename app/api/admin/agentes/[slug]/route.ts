/**
 * GET  /api/admin/agentes/[slug] — detalhe do agente com últimos relatórios
 * PATCH /api/admin/agentes/[slug] — ativar/desativar agente
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()

  const { data: agent, error } = await db
    .from('ai_agents')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })

  const { data: reports } = await db
    .from('ai_agent_reports')
    .select('id, resumo, severidade_max, status, tokens_input, tokens_output, custo_usd, tempo_execucao_ms, created_at')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: runs } = await db
    .from('ai_agent_runs')
    .select('status, tokens_input, tokens_output, custo_usd, started_at, finished_at, erro')
    .eq('agent_id', agent.id)
    .order('started_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ agent, reports: reports ?? [], runs: runs ?? [] })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => ({})) as { ativo?: boolean }
  if (typeof body.ativo !== 'boolean') {
    return NextResponse.json({ error: 'Campo "ativo" (boolean) obrigatório.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('ai_agents')
    .update({ ativo: body.ativo, updated_at: new Date().toISOString() })
    .eq('slug', params.slug)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
