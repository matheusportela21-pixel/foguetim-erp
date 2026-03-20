/**
 * lib/services/agent-communication.ts
 * Engine de comunicação entre agentes IA do Foguetim ERP.
 * Permite que agentes abram threads, debatam problemas e gerem soluções
 * formatadas para o Claude Code. Toda conclusão requer aprovação do Matheus.
 */
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { callAnthropic, extractText } from '@/lib/services/anthropic'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Thread {
  id:                    string
  titulo:                string
  tipo:                  string
  status:                string
  iniciado_por:          string | null
  participantes:         string[] | null
  severidade:            string | null
  tags:                  string[] | null
  resumo_final:          string | null
  solucao_proposta:      string | null
  comando_code:          string | null
  requer_decisao_humana: boolean
  created_at:            string
  updated_at:            string
}

export interface ThreadMessage {
  id:           string
  thread_id:    string
  agent_id:     string | null
  conteudo:     string
  tipo:         string
  tokens_usados: number | null
  created_at:   string
}

export interface AgentInfo {
  id:             string
  nome:           string
  slug:           string
  prompt_sistema: string
  modelo:         string
}

// ── Competency Map ─────────────────────────────────────────────────────────────

const COMPETENCY_MAP: Record<string, string[]> = {
  'erro_sistema':   ['detetive', 'vigia', 'arquiteto'],
  'erro_ml':        ['ml_especialista', 'ml_error_patterns', 'detetive'],
  'mudanca_api_ml': ['ml_novidades', 'ml_schema_watcher', 'arquiteto', 'sugestor'],
  'performance':    ['vigia', 'medico', 'arquiteto'],
  'banco_dados':    ['medico', 'arquiteto'],
  'seguranca':      ['sentinela', 'multitenancy', 'lgpd'],
  'token_auth':     ['ml_auth_guardian', 'sentinela', 'integrador'],
  'webhook':        ['ml_webhook_inspector', 'detetive', 'integrador'],
  'concorrente':    ['concorrencia', 'growth', 'sugestor'],
  'feature':        ['sugestor', 'observador', 'arquiteto'],
  'ux':             ['observador', 'layout', 'onboarding'],
  'conteudo_seo':   ['seo_tecnico', 'palavras_chave', 'redator'],
  'custo':          ['guardiao_custos', 'vigia'],
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Maps thread tipo + tags to competency keys from COMPETENCY_MAP.
 * Returns a deduplicated list of competency keys.
 */
function tagsFromTipo(tipo: string, tags: string[]): string[] {
  const keys: string[] = []

  if (tipo === 'incidente') {
    const tagLower = tags.map(t => t.toLowerCase())
    if (tagLower.some(t => t.includes('ml') || t.includes('mercado'))) {
      keys.push('erro_ml')
    }
    if (tagLower.some(t => t.includes('auth') || t.includes('token'))) {
      keys.push('token_auth')
    }
    if (tagLower.some(t => t.includes('webhook'))) {
      keys.push('webhook')
    }
    if (tagLower.some(t => t.includes('banco') || t.includes('db') || t.includes('database'))) {
      keys.push('banco_dados')
    }
    if (tagLower.some(t => t.includes('segur') || t.includes('lgpd') || t.includes('security'))) {
      keys.push('seguranca')
    }
    if (tagLower.some(t => t.includes('performance') || t.includes('lento') || t.includes('slow'))) {
      keys.push('performance')
    }
    if (tagLower.some(t => t.includes('custo') || t.includes('cost'))) {
      keys.push('custo')
    }
    // Default fallback for generic incidents
    if (keys.length === 0) {
      keys.push('erro_sistema')
    }
  } else if (tipo === 'proposta' || tipo === 'feature') {
    keys.push('feature')
  } else if (tipo === 'novidade') {
    const tagLower = tags.map(t => t.toLowerCase())
    if (tagLower.some(t => t.includes('ml') || t.includes('mercado'))) {
      keys.push('mudanca_api_ml')
    } else {
      keys.push('concorrente')
    }
  } else if (tipo === 'debate') {
    keys.push('feature')
  } else if (tipo === 'melhoria') {
    keys.push('feature')
  } else {
    keys.push('erro_sistema')
  }

  // Deduplicate
  return Array.from(new Set(keys))
}

// ── createThread ───────────────────────────────────────────────────────────────

export async function createThread(params: {
  titulo:           string
  tipo:             'pedido_ajuda' | 'debate' | 'proposta' | 'novidade' | 'incidente' | 'melhoria'
  iniciadoPor:      string
  conteudoInicial:  string
  dadosAnexos?:     unknown
  severidade?:      string
  tags?:            string[]
}): Promise<Thread> {
  const db = supabaseAdmin()

  // 1. Find agent by slug to get its id
  const { data: agent, error: agentErr } = await db
    .from('ai_agents')
    .select('id')
    .eq('slug', params.iniciadoPor)
    .single()

  if (agentErr || !agent) {
    throw new Error(`[agent-communication] Agente não encontrado: ${params.iniciadoPor}`)
  }

  // 2. Insert thread
  const { data: thread, error: threadErr } = await db
    .from('ai_agent_threads')
    .insert({
      titulo:       params.titulo,
      tipo:         params.tipo,
      status:       'aberta',
      iniciado_por: agent.id,
      severidade:   params.severidade ?? null,
      tags:         params.tags ?? null,
    })
    .select()
    .single()

  if (threadErr || !thread) {
    throw new Error(`[agent-communication] Falha ao criar thread: ${threadErr?.message}`)
  }

  // 3. Insert first message
  const { error: msgErr } = await db
    .from('ai_agent_messages')
    .insert({
      thread_id:    thread.id,
      agent_id:     agent.id,
      conteudo:     params.conteudoInicial,
      tipo:         'mensagem',
      dados_anexos: params.dadosAnexos ?? null,
    })

  if (msgErr) {
    console.error('[agent-communication] Falha ao inserir mensagem inicial:', msgErr.message)
  }

  return thread as Thread
}

// ── identifyParticipants ───────────────────────────────────────────────────────

export async function identifyParticipants(thread: Thread): Promise<AgentInfo[]> {
  const db = supabaseAdmin()

  // 1. Get competency keys
  const keys = tagsFromTipo(thread.tipo, thread.tags ?? [])

  // 2. Get unique slugs from COMPETENCY_MAP
  const slugSet = new Set<string>()
  for (const key of keys) {
    const slugs = COMPETENCY_MAP[key] ?? []
    for (const s of slugs) slugSet.add(s)
  }

  // 3. Always add coordenador at the end (will be sorted last)
  slugSet.add('coordenador')

  const slugs = Array.from(slugSet)

  // 4. Fetch agents from DB
  const { data: agents, error } = await db
    .from('ai_agents')
    .select('id, nome, slug, prompt_sistema, modelo')
    .in('slug', slugs)
    .eq('ativo', true)

  if (error || !agents) {
    throw new Error(`[agent-communication] Falha ao buscar agentes: ${error?.message}`)
  }

  // 5. Sort so coordenador is last
  const sorted = (agents as AgentInfo[]).sort((a, b) => {
    if (a.slug === 'coordenador') return 1
    if (b.slug === 'coordenador') return -1
    return 0
  })

  return sorted
}

// ── agentRespond ───────────────────────────────────────────────────────────────

export async function agentRespond(threadId: string, agentSlug: string): Promise<ThreadMessage> {
  const db = supabaseAdmin()

  // 1. Fetch agent
  const { data: agent, error: agentErr } = await db
    .from('ai_agents')
    .select('id, nome, slug, prompt_sistema, modelo')
    .eq('slug', agentSlug)
    .single()

  if (agentErr || !agent) {
    throw new Error(`[agent-communication] Agente não encontrado: ${agentSlug}`)
  }

  const typedAgent = agent as AgentInfo

  // 2. Fetch thread
  const { data: thread, error: threadErr } = await db
    .from('ai_agent_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (threadErr || !thread) {
    throw new Error(`[agent-communication] Thread não encontrada: ${threadId}`)
  }

  const typedThread = thread as Thread

  // 3. Fetch all previous messages with agent names
  const { data: messages, error: msgErr } = await db
    .from('ai_agent_messages')
    .select('id, thread_id, agent_id, conteudo, tipo, tokens_usados, created_at, ai_agents(nome, slug)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (msgErr) {
    console.error('[agent-communication] Falha ao buscar mensagens:', msgErr.message)
  }

  // 4. Build context string
  const formattedMessages = (messages ?? [])
    .map((m: Record<string, unknown>) => {
      const agentData = m.ai_agents as { nome?: string; slug?: string } | null
      const agentName = agentData?.nome ?? 'Humano'
      return `**${agentName}** (${m.tipo}):\n${m.conteudo}`
    })
    .join('\n\n---\n\n')

  const context =
    `## Thread: ${typedThread.titulo}\n` +
    `Tipo: ${typedThread.tipo} | Severidade: ${typedThread.severidade ?? 'não definida'}\n\n` +
    `## Mensagens anteriores:\n${formattedMessages}`

  // 5. Build instruction
  const instruction =
    `Analise esta thread sob sua perspectiva de especialista em ${typedAgent.nome}. ` +
    `Concorde ou discorde com argumentos anteriores usando dados concretos. ` +
    `Termine com uma sugestão concreta e específica. Seja direto e técnico.`

  // 6. Call Anthropic
  const aiRes = await callAnthropic({
    model:        typedAgent.modelo,
    maxTokens:    1500,
    systemPrompt: typedAgent.prompt_sistema,
    messages:     [{ role: 'user', content: `${context}\n\n${instruction}` }],
    temperature:  0.4,
  })

  const conteudo = extractText(aiRes)

  // 7. Save message
  const { data: savedMsg, error: saveErr } = await db
    .from('ai_agent_messages')
    .insert({
      thread_id:     threadId,
      agent_id:      typedAgent.id,
      conteudo,
      tipo:          'analise',
      tokens_usados: aiRes.usage.input_tokens + aiRes.usage.output_tokens,
    })
    .select()
    .single()

  if (saveErr || !savedMsg) {
    throw new Error(`[agent-communication] Falha ao salvar mensagem: ${saveErr?.message}`)
  }

  // 8. Update thread.updated_at
  await db
    .from('ai_agent_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId)

  return savedMsg as ThreadMessage
}

// ── consolidateThread ──────────────────────────────────────────────────────────

export async function consolidateThread(threadId: string): Promise<void> {
  const db = supabaseAdmin()

  // 1. Fetch thread
  const { data: thread, error: threadErr } = await db
    .from('ai_agent_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (threadErr || !thread) {
    throw new Error(`[agent-communication] Thread não encontrada: ${threadId}`)
  }

  const typedThread = thread as Thread

  // 2. Fetch coordenador agent
  const { data: coordenador, error: coordErr } = await db
    .from('ai_agents')
    .select('id, nome, slug, prompt_sistema, modelo')
    .eq('slug', 'coordenador')
    .eq('ativo', true)
    .single()

  if (coordErr || !coordenador) {
    throw new Error('[agent-communication] Agente coordenador não encontrado ou inativo')
  }

  const typedCoordenador = coordenador as AgentInfo

  // 3. Fetch ALL messages with agent names
  const { data: messages, error: msgErr } = await db
    .from('ai_agent_messages')
    .select('id, thread_id, agent_id, conteudo, tipo, tokens_usados, created_at, ai_agents(nome, slug)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  if (msgErr) {
    console.error('[agent-communication] Falha ao buscar mensagens para consolidação:', msgErr.message)
  }

  // 4. Build full context
  const formattedMessages = (messages ?? [])
    .map((m: Record<string, unknown>) => {
      const agentData = m.ai_agents as { nome?: string; slug?: string } | null
      const agentName = agentData?.nome ?? 'Humano'
      return `**${agentName}** (${m.tipo}):\n${m.conteudo}`
    })
    .join('\n\n---\n\n')

  const fullContext =
    `## Thread: ${typedThread.titulo}\n` +
    `Tipo: ${typedThread.tipo} | Severidade: ${typedThread.severidade ?? 'não definida'}\n` +
    `Tags: ${(typedThread.tags ?? []).join(', ') || 'nenhuma'}\n\n` +
    `## Debate completo:\n${formattedMessages}`

  // 5. Build consolidation instruction
  const consolidationInstruction = `Você é o coordenador deste debate entre agentes especialistas. ` +
    `Com base em todas as análises acima, produza uma conclusão executiva em JSON válido (sem markdown). ` +
    `O JSON deve ter exatamente estes campos:\n` +
    `{\n` +
    `  "resumo_final": "string — resumo executivo em 3-5 linhas do problema e das análises",\n` +
    `  "solucao_proposta": "string — solução concreta e priorizada com base nos argumentos",\n` +
    `  "comando_code": "string — markdown formatado com comandos e instruções prontos para colar no Claude Code, inicie com ## Solução para Claude Code\\n\\n",\n` +
    `  "requer_decisao_humana": true | false,\n` +
    `  "motivo_decisao": "string — se requer_decisao_humana=true, descreva exatamente qual decisão o Matheus precisa tomar; caso contrário deixe vazio"\n` +
    `}\n\n` +
    `Responda APENAS com o JSON, sem texto antes ou depois.`

  // 6. Call Anthropic
  const aiRes = await callAnthropic({
    model:        typedCoordenador.modelo,
    maxTokens:    2000,
    systemPrompt: typedCoordenador.prompt_sistema,
    messages:     [{ role: 'user', content: `${fullContext}\n\n${consolidationInstruction}` }],
    temperature:  0.3,
  })

  const rawText = extractText(aiRes)

  // 7. Parse JSON response
  let parsed: {
    resumo_final:          string
    solucao_proposta:      string
    comando_code:          string
    requer_decisao_humana: boolean
    motivo_decisao:        string
  }

  try {
    // Strip possible markdown fences if the model wraps in ```json ... ```
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    parsed = JSON.parse(jsonText) as typeof parsed
  } catch {
    console.error('[agent-communication] Falha ao parsear JSON da consolidação. Raw:', rawText.slice(0, 500))
    throw new Error('[agent-communication] Coordenador retornou JSON inválido na consolidação')
  }

  const totalTokens = aiRes.usage.input_tokens + aiRes.usage.output_tokens

  // 8. Save coordenador's message
  const conclusaoConteudo =
    `**Resumo:** ${parsed.resumo_final}\n\n` +
    `**Solução:** ${parsed.solucao_proposta}\n\n` +
    `${parsed.comando_code}\n\n` +
    (parsed.requer_decisao_humana
      ? `**Decisão necessária:** ${parsed.motivo_decisao}`
      : '')

  await db
    .from('ai_agent_messages')
    .insert({
      thread_id:     threadId,
      agent_id:      typedCoordenador.id,
      conteudo:      conclusaoConteudo,
      tipo:          'conclusao',
      tokens_usados: totalTokens,
    })

  // 9 & 10. Update thread
  const newStatus = parsed.requer_decisao_humana ? 'aguardando_decisao' : 'resolvido'

  await db
    .from('ai_agent_threads')
    .update({
      resumo_final:          parsed.resumo_final,
      solucao_proposta:      parsed.solucao_proposta,
      comando_code:          parsed.comando_code,
      requer_decisao_humana: parsed.requer_decisao_humana,
      status:                newStatus,
      updated_at:            new Date().toISOString(),
    })
    .eq('id', threadId)
}

// ── executeThread ──────────────────────────────────────────────────────────────

export async function executeThread(threadId: string): Promise<void> {
  // 1. Fetch thread
  const db = supabaseAdmin()

  const { data: thread, error: threadErr } = await db
    .from('ai_agent_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (threadErr || !thread) {
    throw new Error(`[agent-communication] Thread não encontrada para execução: ${threadId}`)
  }

  // 2. Identify participants (coordenador will be last, we skip it and call via consolidateThread)
  const participants = await identifyParticipants(thread as Thread)
  const nonCoordinator = participants.filter(a => a.slug !== 'coordenador')

  // 3. For each participant (excluding coordenador): call agentRespond sequentially
  for (const agent of nonCoordinator) {
    try {
      await agentRespond(threadId, agent.slug)
    } catch (err) {
      console.error(
        `[agent-communication] Agente ${agent.slug} falhou na thread ${threadId}:`,
        err instanceof Error ? err.message : String(err)
      )
      // Continue with next agent — don't abort the thread
    }
  }

  // 4. Consolidate as final step
  await consolidateThread(threadId)
}

// ── findRecurringFindings ──────────────────────────────────────────────────────

export async function findRecurringFindings(
  agentSlug: string,
  days: number,
  minCount: number
): Promise<Array<{ titulo: string; count: number }>> {
  const db = supabaseAdmin()

  // 1. Get agent id
  const { data: agent, error: agentErr } = await db
    .from('ai_agents')
    .select('id')
    .eq('slug', agentSlug)
    .single()

  if (agentErr || !agent) {
    console.error(`[agent-communication] Agente não encontrado para findRecurring: ${agentSlug}`)
    return []
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // 2. Query ai_agent_reports within time window
  const { data: reports, error: reportsErr } = await db
    .from('ai_agent_reports')
    .select('achados')
    .eq('agent_id', agent.id)
    .gte('created_at', since)

  if (reportsErr || !reports) {
    console.error('[agent-communication] Falha ao buscar reports:', reportsErr?.message)
    return []
  }

  // 3. Extract and group all achados by titulo
  const countMap = new Map<string, number>()

  for (const report of reports) {
    const achados = report.achados as Array<{ titulo?: string }> | null
    if (!Array.isArray(achados)) continue
    for (const achado of achados) {
      if (typeof achado.titulo === 'string' && achado.titulo) {
        countMap.set(achado.titulo, (countMap.get(achado.titulo) ?? 0) + 1)
      }
    }
  }

  // 4. Filter by minCount and return
  const result: Array<{ titulo: string; count: number }> = []
  countMap.forEach((count, titulo) => {
    if (count >= minCount) {
      result.push({ titulo, count })
    }
  })

  // Sort descending by count
  result.sort((a, b) => b.count - a.count)

  return result
}

// ── checkThreadTriggers ────────────────────────────────────────────────────────

export async function checkThreadTriggers(params: {
  agentSlug:     string
  severidadeMax: string
  achados:       Array<{ titulo: string; descricao: string; severidade: string; sugestao: string }>
  resumo:        string
}): Promise<void> {
  const { agentSlug, severidadeMax, achados } = params

  // 1. Critical incident trigger
  if (severidadeMax === 'critica') {
    const criticalAchados = achados.filter(a => a.severidade === 'critica')

    if (criticalAchados.length > 0) {
      try {
        const thread = await createThread({
          titulo:          `[CRÍTICO] ${criticalAchados[0].titulo}`,
          tipo:            'incidente',
          iniciadoPor:     agentSlug,
          conteudoInicial: JSON.stringify(criticalAchados),
          severidade:      'critica',
          tags:            [agentSlug, 'auto_trigger'],
        })

        // Fire and forget
        executeThread(thread.id).catch((err: unknown) =>
          console.error('[agent-communication] executeThread (crítico) falhou:', err)
        )
      } catch (err) {
        console.error('[agent-communication] Falha ao criar thread crítica:', err)
      }
    }
  }

  // 2. Recurring findings trigger
  try {
    const recurring = await findRecurringFindings(agentSlug, 7, 3)

    if (recurring.length > 0) {
      const top = recurring[0]
      const thread = await createThread({
        titulo:          `[RECORRENTE] ${top.titulo} (${top.count}x em 7 dias)`,
        tipo:            'incidente',
        iniciadoPor:     agentSlug,
        conteudoInicial: JSON.stringify(recurring),
        severidade:      'alta',
        tags:            ['recorrente', 'auto_trigger'],
      })

      // Fire and forget
      executeThread(thread.id).catch((err: unknown) =>
        console.error('[agent-communication] executeThread (recorrente) falhou:', err)
      )
    }
  } catch (err) {
    console.error('[agent-communication] Falha ao verificar achados recorrentes:', err)
  }
}

// ── createManualThread ─────────────────────────────────────────────────────────

export async function createManualThread(params: {
  titulo:    string
  tipo:      'pedido_ajuda' | 'debate' | 'proposta' | 'novidade' | 'incidente' | 'melhoria'
  descricao: string
  tags?:     string[]
}): Promise<{ thread: Thread; started: boolean }> {
  const db = supabaseAdmin()

  // Create thread with iniciado_por = null (human-initiated)
  const { data: thread, error: threadErr } = await db
    .from('ai_agent_threads')
    .insert({
      titulo:       params.titulo,
      tipo:         params.tipo,
      status:       'aberta',
      iniciado_por: null,
      tags:         params.tags ?? null,
    })
    .select()
    .single()

  if (threadErr || !thread) {
    throw new Error(`[agent-communication] Falha ao criar thread manual: ${threadErr?.message}`)
  }

  const typedThread = thread as Thread

  // Insert first message with agent_id = null
  const { error: msgErr } = await db
    .from('ai_agent_messages')
    .insert({
      thread_id: typedThread.id,
      agent_id:  null,
      conteudo:  params.descricao,
      tipo:      'mensagem',
    })

  if (msgErr) {
    console.error('[agent-communication] Falha ao inserir mensagem inicial manual:', msgErr.message)
  }

  // Fire and forget
  executeThread(typedThread.id).catch((err: unknown) =>
    console.error('[agent-communication] executeThread (manual) falhou:', err)
  )

  return { thread: typedThread, started: true }
}
