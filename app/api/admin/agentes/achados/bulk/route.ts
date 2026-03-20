/**
 * PATCH /api/admin/agentes/achados/bulk — atualizar status de múltiplos relatórios em lote
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body   = await req.json() as { report_ids: string[]; status: string }
  const { report_ids, status } = body

  const allowed = ['lido', 'em_andamento', 'resolvido', 'descartado', 'novo']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }
  if (!Array.isArray(report_ids) || report_ids.length === 0) {
    return NextResponse.json({ error: 'report_ids obrigatório' }, { status: 400 })
  }

  const { count, error } = await supabaseAdmin()
    .from('ai_agent_reports')
    .update({ status })
    .in('id', report_ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: count ?? 0 })
}
