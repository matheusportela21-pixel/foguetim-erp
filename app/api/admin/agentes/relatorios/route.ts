/**
 * GET /api/admin/agentes/relatorios — lista relatórios com filtros
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp        = req.nextUrl.searchParams
  const agentSlug = sp.get('agente')    ?? ''
  const severidade = sp.get('severidade') ?? ''
  const status     = sp.get('status')    ?? ''
  const periodo    = sp.get('periodo')   ?? '7d'
  const page       = Math.max(1, Number(sp.get('page') ?? 1))
  const limit      = Math.min(50, Number(sp.get('limit') ?? 20))
  const from       = (page - 1) * limit
  const to         = from + limit - 1

  const db = supabaseAdmin()

  // Calcular data mínima conforme período
  const days: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 }
  const sinceDays = days[periodo] ?? 7
  const sinceDate = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  let query = db
    .from('ai_agent_reports')
    .select(`
      id, resumo, severidade_max, status, tokens_input, tokens_output,
      custo_usd, tempo_execucao_ms, created_at, achados,
      ai_agents ( nome, slug, categoria )
    `, { count: 'exact' })
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (severidade) query = query.eq('severidade_max', severidade)
  if (status)     query = query.eq('status', status)

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filtrar por slug do agente após join (não tem filtro direto via postgrest nesting)
  let filtered = data ?? []
  if (agentSlug) {
    filtered = filtered.filter(r => {
      const ag = r.ai_agents as { slug?: string } | null
      return ag?.slug === agentSlug
    })
  }

  return NextResponse.json({ reports: filtered, total: count ?? 0 })
}
