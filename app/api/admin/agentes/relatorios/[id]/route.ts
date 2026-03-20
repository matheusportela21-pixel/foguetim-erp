/**
 * PATCH /api/admin/agentes/relatorios/[id] — atualiza status do relatório
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const VALID_STATUS = ['novo', 'lido', 'em_andamento', 'resolvido', 'descartado']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => ({})) as { status?: string }
  if (!body.status || !VALID_STATUS.includes(body.status)) {
    return NextResponse.json(
      { error: `Status inválido. Use: ${VALID_STATUS.join(', ')}` },
      { status: 400 },
    )
  }

  const { error } = await supabaseAdmin()
    .from('ai_agent_reports')
    .update({ status: body.status })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
