/**
 * GET  /api/admin/agentes/reunioes/[id] — detalhe completo com relatórios populados
 * PATCH /api/admin/agentes/reunioes/[id] — atualizar status ou proximos_passos
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()
  const { data: meeting, error } = await db
    .from('ai_agent_meetings')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })

  // Populate reports from report_ids
  const reportIds: string[] = Array.isArray(meeting.report_ids) ? meeting.report_ids : []
  let reports: unknown[] = []
  if (reportIds.length > 0) {
    const { data: reps } = await db
      .from('ai_agent_reports')
      .select('id, resumo, severidade_max, achados, custo_usd, tokens_input, tokens_output, tempo_execucao_ms, created_at, ai_agents(nome, slug, categoria)')
      .in('id', reportIds)
      .order('created_at', { ascending: false })
    reports = reps ?? []
  }

  return NextResponse.json({ ...meeting, reports })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json() as Record<string, unknown>
  const db   = supabaseAdmin()

  const allowed: Record<string, unknown> = {}
  if (body.status)          allowed.status          = body.status
  if (body.proximos_passos) allowed.proximos_passos  = body.proximos_passos
  if (body.decisoes)        allowed.decisoes         = body.decisoes

  const { data, error } = await db
    .from('ai_agent_meetings')
    .update(allowed)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
