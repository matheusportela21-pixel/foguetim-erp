/**
 * lib/services/agent-engine.ts
 * Engine de execução dos Agentes de IA do Foguetim ERP.
 *
 * REGRA CRÍTICA: Agentes NUNCA executam ações — apenas analisam e recomendam.
 */
import { supabaseAdmin }                from '@/lib/supabase-admin'
import { callAnthropic, extractText }   from '@/lib/services/anthropic'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentAchado {
  titulo:          string
  descricao:       string
  severidade:      'critica' | 'alta' | 'media' | 'baixa'
  sugestao:        string
  modulo_afetado?: string
}

export interface AgentExecutionResult {
  agentSlug:      string
  achados:        AgentAchado[]
  resumo:         string
  severidadeMax:  string
  tokensInput:    number
  tokensOutput:   number
  custoUsd:       number
  tempoMs:        number
}

interface DBAgent {
  id:             string
  nome:           string
  slug:           string
  categoria:      string
  prompt_sistema: string
  fontes_dados:   Record<string, unknown> | null
  modelo:         string
}

// ── Collectors ────────────────────────────────────────────────────────────────

/**
 * Coleta dados para o Agente Sentinela (segurança).
 */
async function collectSentinelaData(db: ReturnType<typeof supabaseAdmin>): Promise<string> {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [auditRes, activityRes, otpRes, connectionsRes] = await Promise.allSettled([
    db.from('security_audit')
      .select('action, details, created_at, user_id')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(100),

    db.from('activity_logs')
      .select('action, metadata, created_at, user_id')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(50),

    db.from('security_otp')
      .select('status, created_at, user_id')
      .eq('status', 'failed')
      .gte('created_at', since7d)
      .limit(50),

    db.from('marketplace_connections')
      .select('marketplace, user_id, expires_at')
      .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .gt('expires_at', new Date().toISOString()),
  ])

  const audit       = auditRes.status       === 'fulfilled' ? (auditRes.value.data       ?? []) : []
  const activity    = activityRes.status    === 'fulfilled' ? (activityRes.value.data    ?? []) : []
  const otp         = otpRes.status         === 'fulfilled' ? (otpRes.value.data         ?? []) : []
  const connections = connectionsRes.status === 'fulfilled' ? (connectionsRes.value.data ?? []) : []

  return JSON.stringify({
    periodo_analise:          '7 dias',
    security_audit_eventos:   audit,
    activity_logs:            activity,
    otp_falhos:               otp,
    tokens_expirando_24h:     connections,
    totais: {
      audit_eventos:          audit.length,
      otp_falhos:             otp.length,
      tokens_expirando:       connections.length,
    },
  }, null, 2)
}

/**
 * Coleta dados para o Agente Detetive (bugs e erros).
 */
async function collectDetetivelData(db: ReturnType<typeof supabaseAdmin>): Promise<string> {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [errorsRes, webhooksRes] = await Promise.allSettled([
    db.from('activity_logs')
      .select('action, metadata, created_at, user_id')
      .or('action.ilike.%error%,action.ilike.%fail%,action.ilike.%erro%')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(50),

    db.from('webhook_queue')
      .select('event_type, status, error_message, created_at')
      .eq('status', 'error')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const errors   = errorsRes.status   === 'fulfilled' ? (errorsRes.value.data   ?? []) : []
  const webhooks = webhooksRes.status === 'fulfilled' ? (webhooksRes.value.data ?? []) : []

  // Agrupar erros por padrão de ação
  const byAction: Record<string, number> = {}
  for (const e of errors) {
    const key = String(e.action ?? 'unknown')
    byAction[key] = (byAction[key] ?? 0) + 1
  }
  const topErrors = Object.entries(byAction)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }))

  return JSON.stringify({
    periodo_analise:     '7 dias',
    erros_activity_logs: errors,
    webhooks_com_erro:   webhooks,
    top_erros_por_acao:  topErrors,
    totais: {
      erros:   errors.length,
      webhooks: webhooks.length,
    },
  }, null, 2)
}

/**
 * Coleta os relatórios mais recentes de todos os agentes (para o Coordenador).
 */
async function collectCoordenadorData(db: ReturnType<typeof supabaseAdmin>): Promise<string> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: reports } = await db
    .from('ai_agent_reports')
    .select(`
      id, resumo, severidade_max, achados, created_at,
      ai_agents ( nome, slug, categoria )
    `)
    .gte('created_at', since24h)
    .order('created_at', { ascending: false })
    .limit(20)

  return JSON.stringify({
    periodo_analise:   '24 horas',
    relatorios_agentes: reports ?? [],
    total_relatorios:  (reports ?? []).length,
  }, null, 2)
}

/**
 * Seleciona o collector correto para cada agente.
 */
async function collectData(slug: string, db: ReturnType<typeof supabaseAdmin>): Promise<string> {
  switch (slug) {
    case 'sentinela':    return collectSentinelaData(db)
    case 'detetive':     return collectDetetivelData(db)
    case 'coordenador':  return collectCoordenadorData(db)
    default: {
      // Agentes sem collector específico recebem contexto genérico
      return JSON.stringify({ mensagem: `Agente ${slug} sem collector específico. Análise geral do sistema.` })
    }
  }
}

// ── Parsing de resposta ───────────────────────────────────────────────────────

function parseSeveridade(achados: AgentAchado[]): string {
  const priority = ['critica', 'alta', 'media', 'baixa']
  for (const sev of priority) {
    if (achados.some(a => a.severidade === sev)) return sev
  }
  return 'baixa'
}

function parseAchados(text: string): AgentAchado[] {
  // Extrair JSON da resposta (pode vir com markdown ```json ... ```)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  const raw = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : text

  try {
    const parsed = JSON.parse(raw.trim()) as unknown
    if (Array.isArray(parsed)) return parsed as AgentAchado[]
    if (parsed && typeof parsed === 'object' && 'achados' in parsed) {
      return (parsed as { achados: AgentAchado[] }).achados
    }
    return []
  } catch {
    console.warn('[agent-engine] Falha ao parsear JSON da resposta:', raw.slice(0, 200))
    return []
  }
}

function parseMeetingData(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
  const raw = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : text
  try {
    return JSON.parse(raw.trim()) as Record<string, unknown>
  } catch {
    return { raw: text }
  }
}

// ── Engine principal ──────────────────────────────────────────────────────────

/**
 * Executa um agente pelo slug.
 * Cria um run, chama a IA, salva relatório e atualiza o run.
 */
export async function executeAgent(agentSlug: string): Promise<AgentExecutionResult> {
  const db      = supabaseAdmin()
  const startMs = Date.now()

  // 1. Buscar agente
  const { data: agent, error: agentErr } = await db
    .from('ai_agents')
    .select('id, nome, slug, categoria, prompt_sistema, fontes_dados, modelo')
    .eq('slug', agentSlug)
    .eq('ativo', true)
    .single()

  if (agentErr || !agent) {
    throw new Error(`Agente "${agentSlug}" não encontrado ou inativo.`)
  }

  const typedAgent = agent as DBAgent

  // 2. Criar run em 'running'
  const { data: run } = await db
    .from('ai_agent_runs')
    .insert({ agent_id: typedAgent.id, status: 'running' })
    .select('id')
    .single()

  const runId = run?.id

  try {
    // 3. Coletar dados do contexto
    const contextData = await collectData(agentSlug, db)

    // 4. Montar mensagem + chamar Anthropic
    const userMessage = `Dados para análise:\n\n${contextData}\n\nRetorne APENAS o JSON solicitado, sem texto adicional.`

    const aiRes = await callAnthropic({
      model:        typedAgent.modelo ?? 'claude-sonnet-4-20250514',
      maxTokens:    3000,
      systemPrompt: typedAgent.prompt_sistema,
      messages:     [{ role: 'user', content: userMessage }],
      temperature:  0.3,
    })

    const responseText = extractText(aiRes)
    const tempoMs      = Date.now() - startMs

    // 5. Parsear resposta conforme categoria do agente
    let achados: AgentAchado[]     = []
    let resumo = ''
    let meetingData: Record<string, unknown> | null = null

    if (agentSlug === 'coordenador') {
      meetingData = parseMeetingData(responseText)
      // Converter prioridades do coordenador em achados
      const prioridades = meetingData.top_5_prioridades as Array<{
        titulo: string; severidade: string; agente_origem: string; acao_sugerida: string
      }> ?? []
      achados = prioridades.map(p => ({
        titulo:         p.titulo    ?? '',
        descricao:      `Origem: ${p.agente_origem ?? '?'}`,
        severidade:     (p.severidade ?? 'media') as AgentAchado['severidade'],
        sugestao:       p.acao_sugerida ?? '',
        modulo_afetado: p.agente_origem,
      }))
      resumo = String(meetingData.resumo_executivo ?? '')
    } else {
      achados = parseAchados(responseText)
      resumo  = achados.length > 0
        ? `${achados.length} achado(s): ${achados.filter(a => a.severidade === 'critica').length} crítico(s), ${achados.filter(a => a.severidade === 'alta').length} alto(s).`
        : 'Nenhum achado identificado nesta execução.'
    }

    const severidadeMax = parseSeveridade(achados)

    // 6. Salvar relatório
    await db.from('ai_agent_reports').insert({
      agent_id:          typedAgent.id,
      achados:           achados,
      resumo,
      severidade_max:    severidadeMax,
      status:            'novo',
      tokens_input:      aiRes.usage.input_tokens,
      tokens_output:     aiRes.usage.output_tokens,
      custo_usd:         aiRes.costUsd,
      tempo_execucao_ms: tempoMs,
      metadata:          agentSlug === 'coordenador' ? meetingData : null,
    })

    // 7. Se for o Coordenador, salvar ata na tabela de reuniões
    if (agentSlug === 'coordenador' && meetingData) {
      await db.from('ai_agent_meetings').insert({
        titulo:            `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
        participantes:     ['sentinela', 'detetive', 'coordenador'],
        resumo_executivo:  String(meetingData.resumo_executivo ?? ''),
        ata:               responseText,
        decisoes:          meetingData.top_5_prioridades ?? [],
        conflitos:         meetingData.conflitos          ?? [],
        proximos_passos:   meetingData.proximos_passos    ?? [],
      })
    }

    // 8. Atualizar run para 'completed'
    if (runId) {
      await db.from('ai_agent_runs').update({
        status:        'completed',
        tokens_input:  aiRes.usage.input_tokens,
        tokens_output: aiRes.usage.output_tokens,
        custo_usd:     aiRes.costUsd,
        finished_at:   new Date().toISOString(),
      }).eq('id', runId)
    }

    return {
      agentSlug,
      achados,
      resumo,
      severidadeMax,
      tokensInput:  aiRes.usage.input_tokens,
      tokensOutput: aiRes.usage.output_tokens,
      custoUsd:     aiRes.costUsd,
      tempoMs,
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)

    // Atualizar run para 'failed'
    if (runId) {
      await db.from('ai_agent_runs').update({
        status:      'failed',
        erro:        msg,
        finished_at: new Date().toISOString(),
      }).eq('id', runId)
    }

    throw err
  }
}
