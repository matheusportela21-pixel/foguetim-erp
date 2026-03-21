/**
 * POST /api/admin/agentes/resumo-code
 * Gera um resumo unificado pronto para ser copiado ao Claude Code.
 * Busca todos os achados pendentes, chama o Coordenador com prompt especial.
 */
import { NextResponse }   from 'next/server'
import { requireAdmin }   from '@/lib/admin-guard'
import { supabaseAdmin }  from '@/lib/supabase-admin'
import { callAnthropic }  from '@/lib/services/anthropic'

export const dynamic    = 'force-dynamic'
export const runtime    = 'nodejs'
export const maxDuration = 60

export async function POST() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()

  // Busca achados pendentes (novo + em_andamento, últimos 30 dias)
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data: reports } = await db
    .from('ai_agent_reports')
    .select('id, resumo, severidade_max, status, achados, created_at, ai_agents(nome, slug, categoria)')
    .in('status', ['novo', 'em_andamento'])
    .gte('created_at', since30d)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!reports || reports.length === 0) {
    return NextResponse.json({ error: 'Nenhum achado pendente encontrado nos últimos 30 dias.' }, { status: 404 })
  }

  // Agrupar achados por severidade
  interface AchadoItem { titulo?: string; descricao?: string; severidade: string; sugestao?: string; modulo_afetado?: string }
  interface ReportWithAgent { id: string; resumo: string | null; severidade_max: string; status: string; achados: AchadoItem[] | null; created_at: string; ai_agents: { nome: string; slug: string; categoria: string } | null }

  const rows = reports as unknown as ReportWithAgent[]

  const byLevel: Record<string, Array<{ agente: string; titulo: string; descricao: string; sugestao: string; modulo: string }>> = {
    critica: [], alta: [], media: [], baixa: [],
  }

  for (const r of rows) {
    const agente = r.ai_agents?.nome ?? 'Agente'
    for (const a of r.achados ?? []) {
      const sev = (a.severidade ?? 'baixa').toLowerCase()
      const key = (sev === 'crítica' || sev === 'critica') ? 'critica' : sev
      if (!byLevel[key]) byLevel[key] = []
      byLevel[key]!.push({
        agente,
        titulo: a.titulo ?? '',
        descricao: a.descricao ?? '',
        sugestao: a.sugestao ?? '',
        modulo: a.modulo_afetado ?? '',
      })
    }
  }

  const resumoContexto = JSON.stringify({
    total_relatorios_pendentes: rows.length,
    achados_por_severidade: {
      critica: byLevel.critica?.length ?? 0,
      alta: byLevel.alta?.length ?? 0,
      media: byLevel.media?.length ?? 0,
      baixa: byLevel.baixa?.length ?? 0,
    },
    achados_criticos: byLevel.critica?.slice(0, 10),
    achados_altos: byLevel.alta?.slice(0, 15),
    achados_medios: byLevel.media?.slice(0, 10),
    achados_baixos: byLevel.baixa?.slice(0, 5),
  }, null, 2)

  const systemPrompt = `Você é o Agente Coordenador do Foguetim ERP. Gere um COMANDO UNIFICADO pronto para ser enviado ao Claude Code.

O comando deve conter:
1. RESUMO DA SITUAÇÃO: estado atual do sistema em 3-5 frases
2. PROBLEMAS PENDENTES: lista priorizada de tudo que precisa de atenção (críticos primeiro)
3. AÇÕES RECOMENDADAS: para cada problema, passos concretos de implementação
4. ARQUIVOS PROVÁVEIS: quais arquivos do projeto provavelmente precisam ser modificados

Formato: markdown pronto pra copiar e colar no Claude Code como prompt.
Linguagem: português, direto, técnico mas claro.
Não inclua achados já resolvidos ou descartados.`

  const aiRes = await callAnthropic({
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 3000,
    systemPrompt,
    messages: [{ role: 'user', content: `Dados dos achados pendentes do Foguetim ERP:\n\n${resumoContexto}` }],
    temperature: 0.4,
  })

  const texto = aiRes.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map(c => c.text)
    .join('')

  // Salva como meeting tipo resumo_code
  await db.from('ai_agent_meetings').insert({
    titulo: `Resumo para Code — ${new Date().toLocaleDateString('pt-BR')}`,
    participantes: ['coordenador'],
    report_ids: rows.map(r => r.id),
    resumo_executivo: texto.slice(0, 500),
    ata: texto,
    decisoes: [],
    conflitos: [],
    proximos_passos: [],
    status: 'nova',
    custo_usd: aiRes.costUsd,
    tokens_input: aiRes.usage.input_tokens,
    tokens_output: aiRes.usage.output_tokens,
    tempo_execucao_ms: 0,
    metadata: { tipo: 'resumo_code' },
  })

  return NextResponse.json({ texto, custo_usd: aiRes.costUsd })
}
