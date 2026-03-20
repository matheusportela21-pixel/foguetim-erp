/**
 * GET /api/admin/agentes/export
 * Exporta relatórios de agentes em JSON, CSV ou Markdown.
 *
 * Query params:
 *   format     — 'json' | 'csv' | 'markdown'  (default 'json')
 *   period     — '7d' | '30d' | '90d'          (default '7d')
 *   severidade — filtro de severidade_max (opcional)
 *   status     — filtro de status (opcional)
 *   agente     — slug do agente (opcional)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Achado {
  titulo?:    string
  descricao?: string
  severidade: string
  modulo?:    string
  sugestao?:  string
}

interface ReportRow {
  id:                string
  resumo:            string | null
  severidade_max:    string
  status:            string
  achados:           Achado[] | null
  custo_usd:         number | null
  tokens_input:      number | null
  tokens_output:     number | null
  tempo_execucao_ms: number | null
  created_at:        string
  ai_agents:         { nome: string; slug: string; categoria: string } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function periodToDays(period: string): number {
  if (period === '30d') return 30
  if (period === '90d') return 90
  return 7
}

/** Escapa um valor para uma célula CSV: envolve em aspas e dobra aspas internas */
function csvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  return `"${str.replace(/"/g, '""')}"`
}

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

function buildCsv(reports: ReportRow[], period: string): string {
  const header = [
    'data', 'agente', 'categoria', 'titulo', 'descricao',
    'severidade', 'modulo', 'sugestao', 'status', 'custo_usd',
  ].map(csvCell).join(',')

  const rows: string[] = [header]

  for (const r of reports) {
    const agente    = r.ai_agents?.nome      ?? ''
    const categoria = r.ai_agents?.categoria ?? ''
    const data      = r.created_at.slice(0, 10)
    const status    = r.status     ?? ''
    const custo     = r.custo_usd  ?? 0

    const achados = r.achados ?? []

    if (achados.length === 0) {
      // Uma linha por relatório sem achados
      rows.push([
        csvCell(data),
        csvCell(agente),
        csvCell(categoria),
        csvCell(''),
        csvCell(r.resumo ?? ''),
        csvCell(r.severidade_max),
        csvCell(''),
        csvCell(''),
        csvCell(status),
        csvCell(custo),
      ].join(','))
    } else {
      for (const a of achados) {
        rows.push([
          csvCell(data),
          csvCell(agente),
          csvCell(categoria),
          csvCell(a.titulo   ?? ''),
          csvCell(a.descricao ?? ''),
          csvCell(a.severidade ?? ''),
          csvCell(a.modulo   ?? ''),
          csvCell(a.sugestao ?? ''),
          csvCell(status),
          csvCell(custo),
        ].join(','))
      }
    }
  }

  return rows.join('\n')
}

function buildMarkdown(reports: ReportRow[], days: number): string {
  const now         = new Date()
  const geradoEm    = now.toLocaleDateString('pt-BR', { dateStyle: 'long' })

  const lines: string[] = [
    '# Relatórios de Agentes — Foguetim ERP',
    '',
    `**Período:** últimos ${days} dias | **Gerado em:** ${geradoEm}`,
    '',
  ]

  for (const r of reports) {
    const agente  = r.ai_agents?.nome ?? 'Agente desconhecido'
    const dataStr = new Date(r.created_at).toLocaleDateString('pt-BR', { dateStyle: 'long' })
    const achados = r.achados ?? []

    lines.push(`## ${agente} — ${dataStr}`)
    lines.push('')
    lines.push(`**Severidade máxima:** ${r.severidade_max} | **Status:** ${r.status ?? '-'}`)
    lines.push('')

    lines.push('### Resumo')
    lines.push('')
    lines.push(r.resumo ?? '_Sem resumo._')
    lines.push('')

    lines.push(`### Achados (${achados.length})`)
    lines.push('')

    if (achados.length === 0) {
      lines.push('_Nenhum achado registrado._')
    } else {
      for (const a of achados) {
        const sev  = (a.severidade ?? '').toUpperCase()
        const tit  = a.titulo    ?? '(sem título)'
        const desc = a.descricao ?? ''
        const sug  = a.sugestao  ?? ''

        lines.push(`- **[${sev}]** ${tit}`)
        if (desc) lines.push(`  ${desc}`)
        if (sug)  lines.push(`  > 💡 ${sug}`)
      }
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const sp         = req.nextUrl.searchParams
  const format     = sp.get('format')     ?? 'json'
  const period     = sp.get('period')     ?? '7d'
  const severidade = sp.get('severidade') ?? ''
  const statusFilt = sp.get('status')     ?? ''
  const agente     = sp.get('agente')     ?? ''

  const days     = periodToDays(period)
  const since    = new Date(Date.now() - days * 86_400_000)
  const sinceIso = since.toISOString()

  const db = supabaseAdmin()

  // -------------------------------------------------------------------------
  // Query base
  // -------------------------------------------------------------------------
  let query = db
    .from('ai_agent_reports')
    .select(`
      id, resumo, severidade_max, status, achados,
      custo_usd, tokens_input, tokens_output, tempo_execucao_ms, created_at,
      ai_agents ( nome, slug, categoria )
    `)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (severidade) query = query.eq('severidade_max', severidade)
  if (statusFilt) query = query.eq('status', statusFilt)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // -------------------------------------------------------------------------
  // Filtro de agente por slug (após join)
  // -------------------------------------------------------------------------
  let reports: ReportRow[] = (data ?? []) as unknown as ReportRow[]

  if (agente) {
    reports = reports.filter(r => r.ai_agents?.slug === agente)
  }

  const filename = `foguetim-agentes-${period}`

  // -------------------------------------------------------------------------
  // Formato CSV
  // -------------------------------------------------------------------------
  if (format === 'csv') {
    const csv = buildCsv(reports, period)
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  }

  // -------------------------------------------------------------------------
  // Formato Markdown
  // -------------------------------------------------------------------------
  if (format === 'markdown') {
    const md = buildMarkdown(reports, days)
    return new Response(md, {
      status: 200,
      headers: {
        'Content-Type':        'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.md"`,
      },
    })
  }

  // -------------------------------------------------------------------------
  // Formato JSON (default)
  // -------------------------------------------------------------------------
  const body = JSON.stringify({
    reports,
    generated_at: new Date().toISOString(),
    period,
    total: reports.length,
  })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="${filename}.json"`,
    },
  })
}
