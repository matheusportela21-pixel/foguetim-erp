/**
 * POST /api/admin/agentes/relatorio-mensal
 * Gera relatório mensal consolidado chamando a Anthropic API com dados do mês.
 * Body: { month: 'YYYY-MM' }  (default: mês anterior)
 *
 * GET /api/admin/agentes/relatorio-mensal?month=YYYY-MM
 * Retorna o relatório mensal já gerado para o mês informado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { callAnthropic, extractText } from '@/lib/services/anthropic'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // segundos — geração pode ser lenta

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year!, m! - 1, 1, 0, 0, 0, 0).toISOString()
  const end   = new Date(year!, m!,     1, 0, 0, 0, 0).toISOString()
  return { start, end }
}

function prevMonth(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── GET — buscar relatório existente ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const month = req.nextUrl.searchParams.get('month') ?? prevMonth()
  const { start, end } = monthBounds(month)

  const { data } = await supabaseAdmin()
    .from('ai_agent_reports')
    .select('id, resumo, severidade_max, achados, custo_usd, created_at, ai_agents(nome, slug)')
    .gte('created_at', start)
    .lt('created_at', end)
    .not('resumo', 'like', '%relatorio_mensal%')  // exclude previous monthly reports
    .order('created_at', { ascending: false })
    .limit(1)

  // Check for existing monthly report
  const { data: existing } = await supabaseAdmin()
    .from('ai_agent_reports')
    .select('id, resumo, achados, custo_usd, created_at')
    .gte('created_at', start)
    .lt('created_at', end)
    .eq('severidade_max', 'relatorio_mensal')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    month,
    exists:    !!existing,
    relatorio: existing ?? null,
    total_reports: data?.length ?? 0,
  })
}

// ── POST — gerar relatório mensal ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body  = await req.json().catch(() => ({})) as { month?: string }
  const month = body.month ?? prevMonth()
  const { start, end } = monthBounds(month)

  const db = supabaseAdmin()

  // Collect month data
  const [reportsRes, meetingsRes, agentsRes] = await Promise.all([
    db.from('ai_agent_reports')
      .select('id, resumo, severidade_max, achados, custo_usd, tempo_execucao_ms, created_at, ai_agents(nome, slug, categoria)')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .limit(500),
    db.from('ai_agent_meetings')
      .select('id, titulo, resumo_executivo, decisoes, created_at')
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at', { ascending: false })
      .limit(20),
    db.from('ai_agents').select('nome, slug, categoria').eq('ativo', true),
  ])

  const reports  = reportsRes.data  ?? []
  const meetings = meetingsRes.data ?? []
  const agents   = agentsRes.data   ?? []

  if (reports.length === 0) {
    return NextResponse.json({ error: `Nenhum relatório encontrado para ${month}` }, { status: 404 })
  }

  // Compute stats
  let criticos = 0, altos = 0, medios = 0, baixos = 0, custoTotal = 0
  const byAgent: Record<string, { nome: string; achados: number; custo: number }> = {}
  for (const r of reports as Array<Record<string, unknown>>) {
    custoTotal += Number(r.custo_usd ?? 0)
    const ag = r.ai_agents as { nome: string; slug: string } | null
    if (ag) {
      if (!byAgent[ag.slug]) byAgent[ag.slug] = { nome: ag.nome, achados: 0, custo: 0 }
      byAgent[ag.slug]!.custo += Number(r.custo_usd ?? 0)
    }
    for (const a of (r.achados ?? []) as Array<{ severidade?: string }>) {
      const s = (a.severidade ?? '').toLowerCase()
      if (s === 'critica' || s === 'crítica') criticos++
      else if (s === 'alta') altos++
      else if (s === 'media' || s === 'média') medios++
      else baixos++
      if (ag) byAgent[ag.slug]!.achados++
    }
  }

  const topAgents = Object.entries(byAgent)
    .sort(([, a], [, b]) => b.achados - a.achados)
    .slice(0, 5)
    .map(([slug, v]) => `${v.nome}: ${v.achados} achados`)

  const [year, m] = month.split('-')
  const monthLabel = new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const systemPrompt = `Você é o Coordenador do Foguetim ERP gerando o relatório mensal de inteligência.
Responda APENAS com JSON válido no formato especificado. Sem markdown, sem explicações.`

  const userPrompt = `Gere o relatório mensal de ${monthLabel} com base nos dados abaixo.

DADOS DO MÊS:
- Total de relatórios: ${reports.length}
- Agentes ativos: ${agents.length}
- Reuniões realizadas: ${meetings.length}
- Achados: ${criticos} críticos, ${altos} altos, ${medios} médios, ${baixos} baixos
- Custo total: $${custoTotal.toFixed(6)}
- Top agentes por achados: ${topAgents.join(', ')}

Resumos das atas de reunião do mês:
${meetings.slice(0, 5).map((mt: Record<string, unknown>) => `- ${String(mt.titulo ?? '')}: ${String(mt.resumo_executivo ?? '').slice(0, 200)}`).join('\n')}

Retorne JSON:
{
  "titulo": "Relatório Mensal — ${monthLabel}",
  "resumo_executivo": "...",
  "score_medio": <0-100>,
  "principais_riscos": ["risco1", "risco2", "risco3"],
  "conquistas": ["conquista1", "conquista2"],
  "recomendacoes": ["recomendacao1", "recomendacao2", "recomendacao3"],
  "metricas": {
    "total_relatorios": ${reports.length},
    "total_achados_criticos": ${criticos},
    "total_achados_altos": ${altos},
    "custo_total_usd": ${custoTotal.toFixed(8)},
    "reunioes": ${meetings.length}
  }
}`

  const aiRes = await callAnthropic({
    messages:    [{ role: 'user', content: userPrompt }],
    systemPrompt,
    maxTokens:   1500,
  })

  const text = extractText(aiRes)
  let parsed: Record<string, unknown> = {}
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    parsed = JSON.parse(match ? (match[1] ?? match[0]) : text)
  } catch { /* use raw text */ }

  // Find a meta agent to associate the report with (coordenador)
  const { data: coordAgent } = await db
    .from('ai_agents')
    .select('id')
    .eq('slug', 'coordenador')
    .single()

  if (coordAgent) {
    await db.from('ai_agent_reports').insert({
      agent_id:          coordAgent.id,
      resumo:            String(parsed.resumo_executivo ?? text.slice(0, 300)),
      severidade_max:    'relatorio_mensal',
      status:            'novo',
      tokens_input:      aiRes.usage.input_tokens,
      tokens_output:     aiRes.usage.output_tokens,
      custo_usd:         aiRes.costUsd,
      tempo_execucao_ms: 0,
      achados:           (parsed.recomendacoes as string[] ?? []).map((r: string) => ({
        titulo:     r,
        descricao:  '',
        severidade: 'media',
        sugestao:   '',
      })),
      metadata: { month, ...parsed },
    })
  }

  return NextResponse.json({
    month,
    monthLabel,
    relatorio: parsed,
    custo_geracao: aiRes.costUsd,
    tokens: aiRes.usage,
  })
}
