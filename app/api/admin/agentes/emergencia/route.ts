/**
 * POST /api/admin/agentes/emergencia
 * Executa análise de emergência: lê relatórios recentes + gera diagnóstico urgente via Coordenador.
 * NÃO re-executa todos os agentes (isso fica no front-end via executar-todos).
 * Esta rota apenas gera o relatório de emergência baseado nos dados mais recentes.
 */
import { NextResponse }   from 'next/server'
import { requireAdmin }   from '@/lib/admin-guard'
import { supabaseAdmin }  from '@/lib/supabase-admin'
import { callAnthropic }  from '@/lib/services/anthropic'

export const dynamic    = 'force-dynamic'
export const runtime    = 'nodejs'
export const maxDuration = 90

export async function POST() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()

  // Busca relatórios recentes (24h) de todos os agentes
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [{ data: reports }, { data: allAgents }] = await Promise.all([
    db.from('ai_agent_reports')
      .select('id, resumo, severidade_max, status, achados, created_at, ai_agents(nome, slug, categoria)')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('ai_agents').select('nome, slug, categoria, ativo').eq('ativo', true),
  ])

  // Se não tem dados recentes, busca 7 dias
  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const reportsFinal = (reports && reports.length > 5) ? reports : (
    await db.from('ai_agent_reports')
      .select('id, resumo, severidade_max, status, achados, created_at, ai_agents(nome, slug, categoria)')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(200)
  ).data ?? []

  const agentesAtivos = (allAgents ?? []) as Array<{ nome: string; slug: string; categoria: string; ativo: boolean }>

  interface AchadoItem { titulo?: string; descricao?: string; severidade: string; sugestao?: string }
  interface ReportW { id: string; resumo: string | null; severidade_max: string; status: string; achados: AchadoItem[] | null; created_at: string; ai_agents: { nome: string; slug: string; categoria: string } | null }
  const rows = reportsFinal as unknown as ReportW[]

  // Conta achados por severidade
  let nCrit = 0, nAlta = 0, nMedia = 0, nBaixa = 0
  const criticalAchados: Array<{ agente: string; titulo: string; descricao: string; sugestao: string }> = []
  for (const r of rows) {
    for (const a of r.achados ?? []) {
      const sev = (a.severidade ?? '').toLowerCase().replace('í', 'i')
      if (sev === 'critica') { nCrit++; if (criticalAchados.length < 20) criticalAchados.push({ agente: r.ai_agents?.nome ?? '?', titulo: a.titulo ?? '', descricao: a.descricao ?? '', sugestao: a.sugestao ?? '' }) }
      else if (sev === 'alta') nAlta++
      else if (sev === 'media') nMedia++
      else nBaixa++
    }
  }

  const contexto = JSON.stringify({
    momento: new Date().toISOString(),
    agentes_ativos: agentesAtivos.length,
    periodo_analise: reportsFinal.length > 5 ? '24 horas' : '7 dias',
    total_relatorios: rows.length,
    achados_criticos: nCrit,
    achados_altos: nAlta,
    achados_medios: nMedia,
    achados_baixos: nBaixa,
    achados_criticos_detalhes: criticalAchados,
    relatorios_por_agente: rows.slice(0, 50).map(r => ({
      agente: r.ai_agents?.nome ?? '?',
      severidade: r.severidade_max,
      status: r.status,
      resumo: r.resumo?.slice(0, 200) ?? '',
    })),
  }, null, 2)

  const systemPrompt = `REUNIÃO DE EMERGÊNCIA — Foguetim ERP

Analise TODOS os relatórios dos agentes e gere:

1. DIAGNÓSTICO GERAL: estado do sistema agora, em linguagem clara
2. ALERTAS CRÍTICOS: qualquer coisa que precisa de ação IMEDIATA
3. PROBLEMAS SÉRIOS: coisas importantes mas que podem esperar horas
4. SUGESTÕES: melhorias e oportunidades identificadas
5. COMANDO PARA CLAUDE CODE: resumo técnico pronto pra enviar ao Claude Code com todas as correções necessárias

Priorize pela severidade. Seja direto e prático. Use markdown bem formatado com seções claras.`

  const aiRes = await callAnthropic({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 4000,
    systemPrompt,
    messages: [{ role: 'user', content: `Dados do sistema Foguetim ERP:\n\n${contexto}` }],
    temperature: 0.3,
  })

  const texto = aiRes.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map(c => c.text)
    .join('')

  // Salva como meeting tipo emergencia
  const { data: meeting } = await db.from('ai_agent_meetings').insert({
    titulo: `🚨 Reunião de Emergência — ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    participantes: agentesAtivos.map(a => a.slug),
    report_ids: rows.map(r => r.id),
    resumo_executivo: texto.slice(0, 600),
    ata: texto,
    decisoes: [],
    conflitos: [],
    proximos_passos: [],
    status: 'nova',
    custo_usd: aiRes.costUsd,
    tokens_input: aiRes.usage.input_tokens,
    tokens_output: aiRes.usage.output_tokens,
    tempo_execucao_ms: 0,
    metadata: { tipo: 'emergencia', achados_criticos: nCrit, achados_altos: nAlta },
  }).select('id').single()

  return NextResponse.json({
    texto,
    meeting_id: meeting?.id ?? null,
    stats: { criticos: nCrit, altos: nAlta, medios: nMedia, baixos: nBaixa, total_relatorios: rows.length },
    custo_usd: aiRes.costUsd,
  })
}
