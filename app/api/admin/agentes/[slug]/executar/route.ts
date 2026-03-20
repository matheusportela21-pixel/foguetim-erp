/**
 * POST /api/admin/agentes/[slug]/executar — executa agente sob demanda
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { executeAgent }              from '@/lib/services/agent-engine'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const result = await executeAgent(params.slug)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[agentes/executar] Falha ao executar agente "${params.slug}":`, msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
