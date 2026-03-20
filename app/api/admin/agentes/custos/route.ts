/**
 * GET /api/admin/agentes/custos — resumo de custos por agente e total do mês
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: runs, error } = await db
    .from('ai_agent_runs')
    .select('agent_id, tokens_input, tokens_output, custo_usd, status, started_at, ai_agents(nome, slug)')
    .gte('started_at', startOfMonth.toISOString())
    .eq('status', 'completed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupar por agente
  const byAgent: Record<string, {
    nome: string; slug: string; execucoes: number;
    tokens_input: number; tokens_output: number; custo_usd: number
  }> = {}

  let totalCusto = 0

  for (const run of (runs ?? [])) {
    const ag = run.ai_agents as { nome?: string; slug?: string } | null
    const key = run.agent_id as string
    if (!byAgent[key]) {
      byAgent[key] = {
        nome:          ag?.nome ?? 'Desconhecido',
        slug:          ag?.slug ?? '',
        execucoes:     0,
        tokens_input:  0,
        tokens_output: 0,
        custo_usd:     0,
      }
    }
    byAgent[key].execucoes++
    byAgent[key].tokens_input  += Number(run.tokens_input  ?? 0)
    byAgent[key].tokens_output += Number(run.tokens_output ?? 0)
    byAgent[key].custo_usd     += Number(run.custo_usd     ?? 0)
    totalCusto                 += Number(run.custo_usd     ?? 0)
  }

  const BRL_RATE = 5.85 // taxa estimada USD→BRL

  return NextResponse.json({
    por_agente:         Object.values(byAgent),
    total_mes_usd:      Math.round(totalCusto * 1_000_000) / 1_000_000,
    total_mes_brl:      Math.round(totalCusto * BRL_RATE * 100) / 100,
    total_execucoes:    (runs ?? []).length,
    periodo:            `${startOfMonth.toLocaleDateString('pt-BR')} – hoje`,
  })
}
