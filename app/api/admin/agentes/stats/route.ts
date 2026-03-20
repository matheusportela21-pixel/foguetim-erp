/**
 * GET /api/admin/agentes/stats
 * Agrega séries temporais e métricas consolidadas para o dashboard de agentes.
 *
 * Query params:
 *   period   — '7d' | '30d' | '90d'  (default '7d')
 *   agente   — slug do agente (opcional, filtra todas as séries)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface Achado {
  titulo?:    string
  descricao?: string
  severidade: 'critica' | 'alta' | 'media' | 'baixa' | string
  modulo?:    string
  sugestao?:  string
}

interface ReportRow {
  id:            string
  achados:       Achado[] | null
  severidade_max: string
  custo_usd:     number | null
  created_at:    string
  status:        string
  ai_agents:     { nome: string; slug: string; categoria: string } | null
}

interface FeedRow {
  id:            string
  resumo:        string | null
  severidade_max: string
  achados:       Achado[] | null
  created_at:    string
  ai_agents:     { nome: string; slug: string; categoria: string } | null
}

interface RunRow {
  custo_usd:           number | null
  tempo_execucao_ms:   number | null
  started_at:          string
  status:              string
}

interface AgentRow {
  id:   string
  slug: string
  ativo: boolean
}

interface DayStat {
  critica:     number
  alta:        number
  media:       number
  baixa:       number
  custo:       number
  execucoes:   number
  tempo_total: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDays(period: string): number {
  if (period === '30d') return 30
  if (period === '90d') return 90
  return 7
}

/** Retorna YYYY-MM-DD em UTC para um Date */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Constrói array de strings YYYY-MM-DD do mais antigo ao mais recente */
function buildDayRange(days: number, since: Date): string[] {
  const range: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000)
    range.push(toDateStr(d))
  }
  return range
}

function countSeveridades(achados: Achado[] | null): {
  critica: number; alta: number; media: number; baixa: number
} {
  const acc = { critica: 0, alta: 0, media: 0, baixa: 0 }
  for (const a of achados ?? []) {
    const sev = (a.severidade ?? '').toLowerCase()
    if (sev === 'critica' || sev === 'crítica') acc.critica++
    else if (sev === 'alta')                    acc.alta++
    else if (sev === 'media' || sev === 'média') acc.media++
    else if (sev === 'baixa')                   acc.baixa++
  }
  return acc
}

function calcHealthScore(
  reports: ReportRow[],
  sinceMs: number
): number {
  // Usa apenas relatórios das últimas 48 h
  const cutoff = Date.now() - 48 * 60 * 60 * 1000
  const recent = reports.filter(r => new Date(r.created_at).getTime() >= cutoff)

  let penalty = 0
  for (const r of recent) {
    const { critica, alta, media, baixa } = countSeveridades(r.achados)
    penalty += critica * 15 + alta * 8 + media * 3 + baixa * 1
  }
  return Math.max(0, 100 - penalty)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const sp     = req.nextUrl.searchParams
  const period = sp.get('period') ?? '7d'
  const agente = sp.get('agente') ?? ''

  const days  = periodToDays(period)
  const since = new Date(Date.now() - days * 86_400_000)
  const sinceIso = since.toISOString()

  const db = supabaseAdmin()

  // -----------------------------------------------------------------------
  // Consultas paralelas
  // -----------------------------------------------------------------------
  const [reportsRes, runsRes, feedRes, agentsRes] = await Promise.all([
    // 1. Relatórios para séries
    db
      .from('ai_agent_reports')
      .select(`
        id, achados, severidade_max, custo_usd, created_at, status,
        ai_agents ( nome, slug, categoria )
      `)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .limit(2000),

    // 2. Runs para métricas de execução
    db
      .from('ai_agent_runs')
      .select('custo_usd, tempo_execucao_ms, started_at, status')
      .gte('started_at', sinceIso)
      .eq('status', 'completed')
      .limit(2000),

    // 3. Feed (últimos 20 relatórios)
    db
      .from('ai_agent_reports')
      .select(`
        id, resumo, severidade_max, achados, created_at,
        ai_agents ( nome, slug, categoria )
      `)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20),

    // 4. Agentes ativos
    db
      .from('ai_agents')
      .select('id, slug, ativo')
      .eq('ativo', true),
  ])

  if (reportsRes.error) {
    return NextResponse.json({ error: reportsRes.error.message }, { status: 500 })
  }
  if (runsRes.error) {
    return NextResponse.json({ error: runsRes.error.message }, { status: 500 })
  }
  if (feedRes.error) {
    return NextResponse.json({ error: feedRes.error.message }, { status: 500 })
  }

  // -----------------------------------------------------------------------
  // Filtrar por agente (após join)
  // -----------------------------------------------------------------------
  let reports: ReportRow[] = (reportsRes.data ?? []) as unknown as ReportRow[]
  let runs:    RunRow[]    = (runsRes.data   ?? []) as unknown as RunRow[]
  let feed:    FeedRow[]   = (feedRes.data   ?? []) as unknown as FeedRow[]

  if (agente) {
    reports = reports.filter(r => r.ai_agents?.slug === agente)
    feed    = feed.filter(r    => r.ai_agents?.slug === agente)
    // runs não têm join direto aqui — filtro por slug não aplicável sem agent_id;
    // mantemos todos os runs quando filtramos por agente pois não há slug no run
  }

  const agentsAtivos = (agentsRes.data ?? []) as AgentRow[]

  // -----------------------------------------------------------------------
  // Construir mapa de dias
  // -----------------------------------------------------------------------
  const dayRange = buildDayRange(days, since)

  const dayMap: Record<string, DayStat> = {}
  for (const dia of dayRange) {
    dayMap[dia] = {
      critica: 0, alta: 0, media: 0, baixa: 0,
      custo: 0, execucoes: 0, tempo_total: 0,
    }
  }

  // Acumular relatórios
  for (const r of reports) {
    const dia = r.created_at.slice(0, 10)
    if (!dayMap[dia]) continue
    const sev = countSeveridades(r.achados)
    dayMap[dia].critica += sev.critica
    dayMap[dia].alta    += sev.alta
    dayMap[dia].media   += sev.media
    dayMap[dia].baixa   += sev.baixa
    dayMap[dia].custo   += Number(r.custo_usd ?? 0)
  }

  // Acumular runs
  for (const r of runs) {
    const dia = r.started_at.slice(0, 10)
    if (!dayMap[dia]) continue
    dayMap[dia].execucoes++
    dayMap[dia].tempo_total += Number(r.tempo_execucao_ms ?? 0)
  }

  // -----------------------------------------------------------------------
  // Séries de saída
  // -----------------------------------------------------------------------
  const achados_por_dia = dayRange.map(dia => {
    const d = dayMap[dia]
    return {
      dia,
      critica: d.critica,
      alta:    d.alta,
      media:   d.media,
      baixa:   d.baixa,
      total:   d.critica + d.alta + d.media + d.baixa,
    }
  })

  const score_por_dia = dayRange.map(dia => {
    const d = dayMap[dia]
    const total = d.critica + d.alta + d.media + d.baixa
    if (total === 0) return { dia, score: null }
    const penalty = Math.min(100, d.critica * 15 + d.alta * 8 + d.media * 3 + d.baixa * 1)
    return { dia, score: Math.max(0, 100 - penalty) }
  })

  const custo_por_dia = dayRange.map(dia => ({
    dia,
    custo: parseFloat(dayMap[dia].custo.toFixed(8)),
  }))

  const execucoes_por_dia = dayRange.map(dia => {
    const d = dayMap[dia]
    return {
      dia,
      execucoes:   d.execucoes,
      tempo_medio: d.execucoes > 0 ? Math.round(d.tempo_total / d.execucoes) : 0,
    }
  })

  // -----------------------------------------------------------------------
  // Métricas consolidadas
  // -----------------------------------------------------------------------
  const health_score = calcHealthScore(reports, since.getTime())

  const hoje = toDateStr(new Date())
  const hojeStats = dayMap[hoje] ?? {
    critica: 0, alta: 0, media: 0, baixa: 0,
    custo: 0, execucoes: 0, tempo_total: 0,
  }

  const achados_hoje = {
    total:   hojeStats.critica + hojeStats.alta + hojeStats.media + hojeStats.baixa,
    critica: hojeStats.critica,
    alta:    hojeStats.alta,
    media:   hojeStats.media,
    baixa:   hojeStats.baixa,
  }

  const total_custo_periodo = parseFloat(
    reports.reduce((acc, r) => acc + Number(r.custo_usd ?? 0), 0).toFixed(8)
  )

  const execucoes_hoje = hojeStats.execucoes

  const agentes_ativos = agentsAtivos.length

  // -----------------------------------------------------------------------
  // Resposta
  // -----------------------------------------------------------------------
  // -----------------------------------------------------------------------
  // Heatmap (always 90 days, only when no agent filter)
  // -----------------------------------------------------------------------
  let heatmap_90d: Array<{ dia: string; critica: number; alta: number; media: number; baixa: number; total: number }> = []
  if (!agente) {
    const since90 = new Date(Date.now() - 90 * 86_400_000)
    const range90 = buildDayRange(90, since90)
    const map90: Record<string, { critica: number; alta: number; media: number; baixa: number }> = {}
    for (const dia of range90) map90[dia] = { critica: 0, alta: 0, media: 0, baixa: 0 }

    // Re-query if period < 90d
    let reports90 = reports
    if (days < 90) {
      const { data: r90 } = await db
        .from('ai_agent_reports')
        .select('achados, created_at')
        .gte('created_at', since90.toISOString())
        .limit(5000)
      reports90 = (r90 ?? []) as unknown as ReportRow[]
    }
    for (const r of reports90) {
      const dia = r.created_at.slice(0, 10)
      if (!map90[dia]) continue
      const sev = countSeveridades(r.achados)
      map90[dia].critica += sev.critica
      map90[dia].alta    += sev.alta
      map90[dia].media   += sev.media
      map90[dia].baixa   += sev.baixa
    }
    heatmap_90d = range90.map(dia => {
      const d = map90[dia]
      return { dia, critica: d.critica, alta: d.alta, media: d.media, baixa: d.baixa, total: d.critica + d.alta + d.media + d.baixa }
    })
  }

  // -----------------------------------------------------------------------
  // Ranking de agentes (apenas sem filtro de agente)
  // -----------------------------------------------------------------------
  interface RankingAgent { nome: string; slug: string; categoria: string; achados_util: number; descartados: number; taxa_util: number; custo_mes: number }
  let ranking_agentes: RankingAgent[] = []
  if (!agente) {
    const agentStats: Record<string, { nome: string; slug: string; categoria: string; util: number; descartados: number; custo: number }> = {}
    for (const r of reports) {
      const ag = r.ai_agents
      if (!ag) continue
      if (!agentStats[ag.slug]) agentStats[ag.slug] = { nome: ag.nome, slug: ag.slug, categoria: ag.categoria, util: 0, descartados: 0, custo: 0 }
      const achados = r.achados ?? []
      if (r.status === 'resolvido' || r.status === 'em_andamento') {
        agentStats[ag.slug].util += achados.length
      } else if (r.status === 'descartado') {
        agentStats[ag.slug].descartados += achados.length
      }
      agentStats[ag.slug].custo += Number(r.custo_usd ?? 0)
    }
    ranking_agentes = Object.values(agentStats)
      .map(a => {
        const total = a.util + a.descartados
        return {
          nome:        a.nome,
          slug:        a.slug,
          categoria:   a.categoria,
          achados_util: a.util,
          descartados:  a.descartados,
          taxa_util:    total > 0 ? Math.round((a.util / total) * 100) : 0,
          custo_mes:    parseFloat(a.custo.toFixed(8)),
        }
      })
      .sort((a, b) => b.taxa_util - a.taxa_util || b.achados_util - a.achados_util)
      .slice(0, 15)
  }

  return NextResponse.json({
    // Séries
    achados_por_dia,
    score_por_dia,
    custo_por_dia,
    execucoes_por_dia,
    // Métricas
    health_score,
    achados_hoje,
    total_custo_periodo,
    execucoes_hoje,
    agentes_ativos,
    // Feed
    feed,
    // Heatmap
    heatmap_90d,
    // Ranking
    ranking_agentes,
    // Meta
    period,
    days,
    since: sinceIso,
  })
}
