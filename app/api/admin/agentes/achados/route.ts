/**
 * GET  /api/admin/agentes/achados — visão unificada de todos os achados com filtros avançados
 * PATCH /api/admin/agentes/achados/bulk — ações em lote
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface AchadoRow {
  titulo?:        string
  descricao?:     string
  severidade:     string
  sugestao?:      string
  modulo_afetado?: string
}

interface ReportRow {
  id:             string
  status:         string
  achados:        AchadoRow[] | null
  severidade_max: string
  created_at:     string
  ai_agents:      { nome: string; slug: string; categoria: string } | null
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp          = req.nextUrl.searchParams
  const page        = Math.max(1, Number(sp.get('page')  ?? 1))
  const limit       = Math.min(100, Number(sp.get('limit') ?? 50))
  const search      = sp.get('search')    ?? ''
  const after       = sp.get('after')     ?? ''
  const before      = sp.get('before')    ?? ''

  // Multi-value filters
  const severidades  = sp.getAll('severidade')
  const agentes      = sp.getAll('agente')
  const categorias   = sp.getAll('categoria')
  const statuses     = sp.getAll('status')

  const db = supabaseAdmin()

  const days = 30
  const sinceDefault = new Date(Date.now() - days * 86_400_000).toISOString()

  let query = db
    .from('ai_agent_reports')
    .select('id, status, achados, severidade_max, created_at, ai_agents(nome, slug, categoria)', { count: 'exact' })
    .gte('created_at', after || sinceDefault)
    .order('created_at', { ascending: false })
    .limit(500) // fetch more, flatten after

  if (before) query = query.lte('created_at', before)

  // Status filter at report level
  if (statuses.length > 0) query = query.in('status', statuses)

  const { data: reports, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten achados from reports
  const rows: Array<{
    report_id: string; report_status: string; report_created_at: string
    agent_nome: string; agent_slug: string; agent_categoria: string
    titulo: string; descricao: string; severidade: string
    sugestao: string; modulo_afetado: string
  }> = []

  for (const r of (reports as unknown as ReportRow[])) {
    const ag = r.ai_agents
    if (!ag) continue

    // Agent filters
    if (agentes.length > 0    && !agentes.includes(ag.slug))        continue
    if (categorias.length > 0 && !categorias.includes(ag.categoria)) continue

    for (const a of r.achados ?? []) {
      const sev = (a.severidade ?? '').toLowerCase()

      // Severity filter
      if (severidades.length > 0 && !severidades.some(s => s.toLowerCase() === sev)) continue

      // Text search
      if (search) {
        const hay = `${a.titulo ?? ''} ${a.descricao ?? ''}`.toLowerCase()
        if (!hay.includes(search.toLowerCase())) continue
      }

      rows.push({
        report_id:          r.id,
        report_status:      r.status,
        report_created_at:  r.created_at,
        agent_nome:         ag.nome,
        agent_slug:         ag.slug,
        agent_categoria:    ag.categoria,
        titulo:             a.titulo        ?? '',
        descricao:          a.descricao     ?? '',
        severidade:         sev,
        sugestao:           a.sugestao      ?? '',
        modulo_afetado:     a.modulo_afetado ?? '',
      })
    }
  }

  // Smart sort: critical new first, then high, then recurring, then medium, then low
  const sevOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }
  const stsOrder: Record<string, number> = { novo: 0, em_andamento: 1, lido: 2, resolvido: 3, descartado: 4 }
  rows.sort((a, b) => {
    const sa = sevOrder[a.severidade] ?? 9
    const sb = sevOrder[b.severidade] ?? 9
    if (sa !== sb) return sa - sb
    const ta = stsOrder[a.report_status] ?? 9
    const tb = stsOrder[b.report_status] ?? 9
    if (ta !== tb) return ta - tb
    return new Date(b.report_created_at).getTime() - new Date(a.report_created_at).getTime()
  })

  const total  = rows.length
  const from   = (page - 1) * limit
  const paged  = rows.slice(from, from + limit)

  // Build available filters
  const allAgents  = Array.from(new Set(rows.map(r => `${r.agent_slug}|${r.agent_nome}|${r.agent_categoria}`))).map(s => {
    const [slug, nome, categoria] = s.split('|')
    return { slug, nome, categoria }
  })
  const allMods = Array.from(new Set(rows.map(r => r.modulo_afetado).filter(Boolean)))

  return NextResponse.json({
    achados: paged,
    total,
    page,
    limit,
    filters_available: {
      agentes:    allAgents,
      modulos:    allMods,
      categorias: Array.from(new Set(rows.map(r => r.agent_categoria))),
    },
  })
}
