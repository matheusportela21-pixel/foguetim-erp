/**
 * lib/services/agent-engine.ts
 * Engine de execução dos Agentes de IA do Foguetim ERP.
 * FASE 2: 11 agentes com collectors individuais.
 *
 * REGRA CRÍTICA: Agentes NUNCA executam ações — apenas analisam e recomendam.
 */
import { supabaseAdmin }                from '@/lib/supabase-admin'
import { callAnthropic, extractText }   from '@/lib/services/anthropic'
import { execSync }                     from 'child_process'
import path                             from 'path'

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

type DB = ReturnType<typeof supabaseAdmin>

// ── Helpers ───────────────────────────────────────────────────────────────────

const since = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

async function safeQuery<T>(promise: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const { data } = await promise
    return data ?? []
  } catch {
    return []
  }
}

// ── Collectors ────────────────────────────────────────────────────────────────

async function collectSentinelaData(db: DB): Promise<string> {
  const [audit, activity, otp, connections] = await Promise.all([
    safeQuery(db.from('security_audit').select('action, details, created_at, user_id').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(100)),
    safeQuery(db.from('activity_logs').select('action, metadata, created_at, user_id').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(50)),
    safeQuery(db.from('security_otp').select('status, created_at, user_id').eq('status', 'failed').gte('created_at', since(7)).limit(50)),
    safeQuery(db.from('marketplace_connections').select('marketplace, user_id, expires_at').lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()).gt('expires_at', new Date().toISOString())),
  ])

  return JSON.stringify({
    periodo_analise:          '7 dias',
    security_audit_eventos:   audit,
    activity_logs:            activity,
    otp_falhos:               otp,
    tokens_expirando_24h:     connections,
    totais: { audit_eventos: audit.length, otp_falhos: otp.length, tokens_expirando: connections.length },
  }, null, 2)
}

async function collectDetetivelData(db: DB): Promise<string> {
  const [errors, webhooks] = await Promise.all([
    safeQuery(db.from('activity_logs').select('action, metadata, created_at, user_id').or('action.ilike.%error%,action.ilike.%fail%,action.ilike.%erro%').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(50)),
    safeQuery(db.from('webhook_queue').select('event_type, status, error_message, created_at').eq('status', 'error').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(50)),
  ])

  const byAction: Record<string, number> = {}
  for (const e of errors) {
    const key = String((e as Record<string, unknown>).action ?? 'unknown')
    byAction[key] = (byAction[key] ?? 0) + 1
  }
  const topErrors = Object.entries(byAction).sort(([, a], [, b]) => b - a).slice(0, 10).map(([action, count]) => ({ action, count }))

  return JSON.stringify({
    periodo_analise: '7 dias',
    erros_activity_logs: errors,
    webhooks_com_erro:   webhooks,
    top_erros_por_acao:  topErrors,
    totais: { erros: errors.length, webhooks: webhooks.length },
  }, null, 2)
}

async function collectMedicoData(db: DB): Promise<string> {
  const since30 = since(30)

  const [
    products, listings, orders, mappings,
    productsVazios, mappingsConflict, connectionsExpired, orphans,
    pgStats,
  ] = await Promise.all([
    safeQuery(db.from('warehouse_products').select('id').limit(1)),
    safeQuery(db.from('ml_listings').select('id').limit(1)),
    safeQuery(db.from('orders').select('id').limit(1)),
    safeQuery(db.from('warehouse_product_mappings').select('id').limit(1)),
    safeQuery(db.from('warehouse_products').select('id, sku, name').or('sku.is.null,name.is.null').limit(50)),
    safeQuery(db.from('warehouse_product_mappings').select('id, product_id, marketplace_item_id').eq('mapping_status', 'conflict').limit(50)),
    safeQuery(db.from('marketplace_connections').select('marketplace, user_id, expires_at').lt('expires_at', new Date().toISOString()).limit(50)),
    // Registros órfãos: mapeamentos sem produto correspondente
    safeQuery(db.from('warehouse_product_mappings').select('id, product_id').is('product_id', null).limit(50)),
    // Estatísticas pg (pode falhar sem permissão)
    safeQuery(db.rpc('pg_stat_user_tables_summary' as never).limit(10) as never),
  ])

  return JSON.stringify({
    periodo_analise: '30 dias',
    contagens_tabelas: {
      warehouse_products:          products.length > 0 ? '≥1 (sample)' : 0,
      ml_listings:                 listings.length > 0 ? '≥1 (sample)' : 0,
      orders:                      orders.length   > 0 ? '≥1 (sample)' : 0,
      warehouse_product_mappings:  mappings.length > 0 ? '≥1 (sample)' : 0,
    },
    produtos_com_campos_vazios:    productsVazios,
    mapeamentos_em_conflito:       mappingsConflict,
    tokens_expirados_nao_limpos:   connectionsExpired,
    mapeamentos_orfaos:            orphans,
    pg_stats:                      pgStats,
    totais: {
      produtos_vazios:    productsVazios.length,
      conflitos:          mappingsConflict.length,
      tokens_expirados:   connectionsExpired.length,
      orfaos:             orphans.length,
    },
  }, null, 2)
}

async function collectVigiaData(db: DB): Promise<string> {
  const [webhooksStatus, syncErrors, mlCalls, otpStats] = await Promise.all([
    // Webhooks 24h por status
    safeQuery(db.from('webhook_queue').select('status, created_at').gte('created_at', since(1)).limit(500)),
    // Sync errors 7 dias
    safeQuery(db.from('sync_log').select('channel, field, status, created_at, error_message').eq('status', 'error').gte('created_at', since(7)).limit(100)),
    // Chamadas ML 7 dias
    safeQuery(db.from('activity_logs').select('action, created_at').or('action.ilike.%ml%,action.ilike.%mercadolivre%').gte('created_at', since(7)).limit(200)),
    // OTP stats 7 dias
    safeQuery(db.from('security_otp').select('status, created_at').gte('created_at', since(7)).limit(500)),
  ])

  const webhookByStatus: Record<string, number> = {}
  for (const w of webhooksStatus) {
    const s = String((w as Record<string, unknown>).status ?? 'unknown')
    webhookByStatus[s] = (webhookByStatus[s] ?? 0) + 1
  }

  const otpByStatus: Record<string, number> = {}
  for (const o of otpStats) {
    const s = String((o as Record<string, unknown>).status ?? 'unknown')
    otpByStatus[s] = (otpByStatus[s] ?? 0) + 1
  }
  const otpTotal  = otpStats.length
  const otpFailed = otpByStatus['failed'] ?? 0
  const otpTaxaFalha = otpTotal > 0 ? Math.round((otpFailed / otpTotal) * 100) : 0

  return JSON.stringify({
    periodo_analise: '24h (webhooks) / 7 dias (resto)',
    webhooks_24h_por_status: webhookByStatus,
    sync_errors_7d:          syncErrors,
    chamadas_ml_7d:          mlCalls.length,
    otp: { total: otpTotal, falhos: otpFailed, taxa_falha_pct: otpTaxaFalha, por_status: otpByStatus },
    totais: { webhooks_24h: webhooksStatus.length, sync_errors: syncErrors.length },
  }, null, 2)
}

async function collectObservadorData(db: DB): Promise<string> {
  const [usuarios, usuariosInativos, prods, mappings, movimentos, actions, feedbacks] = await Promise.all([
    safeQuery(db.from('users').select('id, created_at').gte('created_at', since(7)).limit(500)),
    safeQuery(db.from('users').select('id').lt('created_at', since(30)).limit(200)),
    safeQuery(db.from('warehouse_products').select('id, user_id').limit(500)),
    safeQuery(db.from('warehouse_product_mappings').select('id, user_id, created_at').gte('created_at', since(7)).limit(200)),
    safeQuery(db.from('stock_movements').select('id, user_id, created_at').gte('created_at', since(7)).limit(200)),
    safeQuery(db.from('activity_logs').select('action, created_at').gte('created_at', since(7)).limit(1000)),
    safeQuery(db.from('feedback_tickets').select('category, status, created_at').gte('created_at', since(7)).limit(100)),
  ])

  const byAction: Record<string, number> = {}
  for (const a of actions) {
    const key = String((a as Record<string, unknown>).action ?? 'unknown').split('.')[0] ?? 'unknown'
    byAction[key] = (byAction[key] ?? 0) + 1
  }
  const topModulos = Object.entries(byAction).sort(([, a], [, b]) => b - a).slice(0, 10)

  return JSON.stringify({
    periodo_analise: '7 dias (ativos) / 30 dias (inativos)',
    usuarios_ativos_7d:   usuarios.length,
    usuarios_inativos_30d: usuariosInativos.length,
    total_produtos:        prods.length,
    mapeamentos_criados_7d: mappings.length,
    movimentos_estoque_7d: movimentos.length,
    top_modulos_por_atividade: topModulos,
    feedbacks_7d:          feedbacks,
  }, null, 2)
}

async function collectIntegradorData(db: DB): Promise<string> {
  const [connections, webhooks24h, webhooksErro, syncErrors, mappingsAutoSync] = await Promise.all([
    safeQuery(db.from('marketplace_connections').select('marketplace, user_id, expires_at, connected, data').limit(50)),
    safeQuery(db.from('webhook_queue').select('topic, status, created_at').gte('created_at', since(1)).limit(500)),
    safeQuery(db.from('webhook_queue').select('topic, error_message, created_at').eq('status', 'error').gte('created_at', since(1)).limit(100)),
    safeQuery(db.from('sync_log').select('channel, field, status, error_message, created_at').eq('status', 'error').gte('created_at', since(7)).limit(100)),
    safeQuery(db.from('warehouse_product_mappings').select('id, user_id, last_synced_at').eq('auto_sync_stock', true).limit(200)),
  ])

  const webhookByTopic: Record<string, number> = {}
  for (const w of webhooks24h) {
    const t = String((w as Record<string, unknown>).topic ?? 'unknown')
    webhookByTopic[t] = (webhookByTopic[t] ?? 0) + 1
  }

  // Mapeamentos com auto_sync que não sincronizaram nas últimas 24h
  const now = Date.now()
  const autoSyncAtrasados = mappingsAutoSync.filter(m => {
    const last = (m as Record<string, unknown>).last_synced_at
    if (!last) return true
    return (now - new Date(String(last)).getTime()) > 24 * 60 * 60 * 1000
  })

  return JSON.stringify({
    periodo_analise: '24h (webhooks) / 7 dias (sync)',
    conexoes_marketplace:          connections,
    webhooks_24h_por_topico:       webhookByTopic,
    webhooks_com_erro_24h:         webhooksErro,
    sync_errors_7d:                syncErrors,
    auto_sync_atrasados:           autoSyncAtrasados.length,
    totais: {
      webhooks_24h:   webhooks24h.length,
      erros_webhook:  webhooksErro.length,
      erros_sync:     syncErrors.length,
      auto_sync_late: autoSyncAtrasados.length,
    },
  }, null, 2)
}

async function collectArquitetoData(db: DB): Promise<string> {
  // Contar rotas e páginas via filesystem (disponível em runtime Node.js)
  let totalRotas  = 0
  let totalPaginas = 0
  let tabelasSemRLS: string[] = []

  try {
    const root = path.resolve(process.cwd(), 'app')
    const rotasOut  = execSync(`find "${root}" -name "route.ts" 2>/dev/null | wc -l`, { encoding: 'utf8', timeout: 5000 }).trim()
    const paginasOut = execSync(`find "${root}" -name "page.tsx" 2>/dev/null | wc -l`, { encoding: 'utf8', timeout: 5000 }).trim()
    totalRotas   = parseInt(rotasOut)   || 0
    totalPaginas = parseInt(paginasOut) || 0
  } catch {
    // fallback: estimativa baseada no build
    totalRotas   = 120
    totalPaginas = 60
  }

  // Tabelas sem RLS via information_schema
  try {
    const { data: rlsData } = await db.rpc('get_tables_without_rls' as never) as { data: Array<{ tablename: string }> | null }
    tabelasSemRLS = (rlsData ?? []).map((r: { tablename: string }) => r.tablename)
  } catch {
    // pode não ter permissão
  }

  // Contar tabelas
  const { data: tables } = await db.from('information_schema.tables' as never)
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE') as { data: Array<{ table_name: string }> | null }

  const totalTabelas = (tables ?? []).length

  return JSON.stringify({
    periodo_analise: 'snapshot atual',
    metricas_codebase: {
      total_rotas_api:  totalRotas,
      total_paginas:    totalPaginas,
      total_tabelas:    totalTabelas,
      tabelas_sem_rls:  tabelasSemRLS,
    },
    observacoes: [
      'Arquivos grandes (>500 linhas) não analisados em runtime — use análise estática.',
      `Total de tabelas no schema public: ${totalTabelas}`,
      `Tabelas sem RLS detectadas: ${tabelasSemRLS.length}`,
    ],
  }, null, 2)
}

async function collectGuardiaoCustosData(db: DB): Promise<string> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [runs, companyCosts] = await Promise.all([
    safeQuery(db.from('ai_agent_runs').select('agent_id, tokens_input, tokens_output, custo_usd, status, ai_agents(nome, slug)').gte('started_at', startOfMonth.toISOString()).eq('status', 'completed')),
    safeQuery(db.from('company_costs').select('category, amount, month').order('month', { ascending: false }).limit(12)),
  ])

  // Agrupar por agente
  const byAgent: Record<string, { nome: string; execucoes: number; tokens: number; custo: number }> = {}
  let totalUsd = 0; let totalTokens = 0

  for (const r of runs) {
    const run = r as Record<string, unknown>
    const ag  = run.ai_agents as { nome?: string; slug?: string } | null
    const key = String(run.agent_id ?? 'unknown')
    if (!byAgent[key]) byAgent[key] = { nome: ag?.nome ?? 'Desconhecido', execucoes: 0, tokens: 0, custo: 0 }
    byAgent[key].execucoes++
    byAgent[key].tokens += Number(run.tokens_input ?? 0) + Number(run.tokens_output ?? 0)
    byAgent[key].custo  += Number(run.custo_usd ?? 0)
    totalUsd    += Number(run.custo_usd ?? 0)
    totalTokens += Number(run.tokens_input ?? 0) + Number(run.tokens_output ?? 0)
  }

  const top3 = Object.values(byAgent).sort((a, b) => b.custo - a.custo).slice(0, 3)
  const diaDoMes = new Date().getDate()
  const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const projecao = diaDoMes > 0 ? (totalUsd / diaDoMes) * diasNoMes : 0

  return JSON.stringify({
    periodo_analise:  `Mês atual (${startOfMonth.toLocaleDateString('pt-BR')} – hoje)`,
    por_agente:       Object.values(byAgent),
    totais: {
      total_usd_mes:          Math.round(totalUsd    * 1_000_000) / 1_000_000,
      total_tokens_mes:       totalTokens,
      projecao_proximo_mes:   Math.round(projecao    * 1_000_000) / 1_000_000,
      top3_agentes_mais_caros: top3,
    },
    custos_empresa: companyCosts,
  }, null, 2)
}

async function collectAuditorData(db: DB): Promise<string> {
  const [reports, agents, runs] = await Promise.all([
    safeQuery(db.from('ai_agent_reports').select('agent_id, status, achados, custo_usd, created_at, ai_agents(nome, slug)').gte('created_at', since(30)).limit(500)),
    safeQuery(db.from('ai_agents').select('id, nome, slug, ativo').limit(20)),
    safeQuery(db.from('ai_agent_runs').select('agent_id, custo_usd, status').gte('started_at', since(30)).limit(200)),
  ])

  // Scorecard por agente
  const scorecard: Record<string, {
    nome: string; slug: string; total: number
    uteis: number; descartados: number; custo: number
  }> = {}

  for (const a of agents) {
    const ag = a as Record<string, unknown>
    const key = String(ag.id)
    scorecard[key] = { nome: String(ag.nome), slug: String(ag.slug), total: 0, uteis: 0, descartados: 0, custo: 0 }
  }

  for (const r of reports) {
    const report = r as Record<string, unknown>
    const key = String(report.agent_id ?? '')
    if (!scorecard[key]) continue
    scorecard[key].total++
    if (report.status === 'resolvido') scorecard[key].uteis++
    if (report.status === 'descartado') scorecard[key].descartados++
    scorecard[key].custo += Number(report.custo_usd ?? 0)
  }

  const scorecardList = Object.values(scorecard).map(s => ({
    ...s,
    utilidade_pct: s.total > 0 ? Math.round((s.uteis / s.total) * 100) : null,
  }))

  return JSON.stringify({
    periodo_analise: '30 dias',
    scorecard:       scorecardList,
    total_relatorios: reports.length,
    total_runs:       runs.length,
  }, null, 2)
}

async function collectSugestorData(db: DB): Promise<string> {
  const [reportsRecentes, feedbacks, tickets, actions] = await Promise.all([
    safeQuery(db.from('ai_agent_reports').select('achados, resumo, created_at, ai_agents(nome, slug)').gte('created_at', since(30)).order('created_at', { ascending: false }).limit(100)),
    safeQuery(db.from('feedback_tickets').select('category, description, status, created_at').gte('created_at', since(30)).limit(50)),
    safeQuery(db.from('support_tickets').select('subject, status, priority, created_at').gte('created_at', since(30)).limit(50)),
    safeQuery(db.from('activity_logs').select('action, created_at').gte('created_at', since(30)).limit(1000)),
  ])

  // Módulos por atividade
  const byModule: Record<string, number> = {}
  for (const a of actions) {
    const key = String((a as Record<string, unknown>).action ?? '').split('.')[0] ?? 'unknown'
    byModule[key] = (byModule[key] ?? 0) + 1
  }
  const modulosPorAtividade = Object.entries(byModule).sort(([, a], [, b]) => b - a).slice(0, 10)

  return JSON.stringify({
    periodo_analise: '30 dias',
    relatorios_agentes_recentes: reportsRecentes.slice(0, 20),
    feedbacks_30d:               feedbacks,
    tickets_30d:                 tickets,
    modulos_por_atividade:       modulosPorAtividade,
    totais: {
      relatorios: reportsRecentes.length,
      feedbacks:  feedbacks.length,
      tickets:    tickets.length,
    },
  }, null, 2)
}

async function collectCoordenadorData(db: DB): Promise<string> {
  // Coordenador atualizado: busca relatórios de TODOS os agentes ativos
  const since48h = since(2) // 48h para capturar execuções do dia

  const [reports, agents] = await Promise.all([
    safeQuery(db.from('ai_agent_reports').select('id, resumo, severidade_max, achados, created_at, ai_agents(nome, slug, categoria)').gte('created_at', since48h).order('created_at', { ascending: false }).limit(50)),
    safeQuery(db.from('ai_agents').select('nome, slug, categoria, ativo').limit(20)),
  ])

  const agentesAtivos   = agents.filter(a => (a as Record<string, unknown>).ativo === true)
  const slugsComRelatorio = new Set(
    reports.map(r => {
      const ag = (r as Record<string, unknown>).ai_agents as { slug?: string } | null
      return ag?.slug ?? ''
    }).filter(Boolean),
  )
  const agentessSemRelatorio = agentesAtivos
    .filter(a => !slugsComRelatorio.has(String((a as Record<string, unknown>).slug ?? '')))
    .map(a => (a as Record<string, unknown>).slug)

  return JSON.stringify({
    periodo_analise:          '48 horas',
    relatorios_agentes:       reports,
    total_relatorios:         reports.length,
    total_agentes_ativos:     agentesAtivos.length,
    agentes_sem_relatorio:    agentessSemRelatorio,
    cobertura_pct:            agentesAtivos.length > 0
      ? Math.round((slugsComRelatorio.size / agentesAtivos.length) * 100)
      : 0,
  }, null, 2)
}

/**
 * Seleciona o collector correto para cada agente.
 */
async function collectData(slug: string, db: DB): Promise<string> {
  switch (slug) {
    case 'sentinela':       return collectSentinelaData(db)
    case 'detetive':        return collectDetetivelData(db)
    case 'medico':          return collectMedicoData(db)
    case 'vigia':           return collectVigiaData(db)
    case 'observador':      return collectObservadorData(db)
    case 'integrador':      return collectIntegradorData(db)
    case 'arquiteto':       return collectArquitetoData(db)
    case 'guardiao_custos': return collectGuardiaoCustosData(db)
    case 'auditor':         return collectAuditorData(db)
    case 'sugestor':        return collectSugestorData(db)
    case 'coordenador':     return collectCoordenadorData(db)
    default:
      return JSON.stringify({ mensagem: `Agente ${slug} sem collector específico. Análise geral do sistema.` })
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

function parseJSON(text: string): Record<string, unknown> {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
  const raw = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text
  try {
    return JSON.parse(raw.trim()) as Record<string, unknown>
  } catch {
    console.warn('[agent-engine] Falha ao parsear JSON:', raw.slice(0, 200))
    return {}
  }
}

function parseAchados(text: string): AgentAchado[] {
  const parsed = parseJSON(text)
  if (Array.isArray(parsed)) return parsed as AgentAchado[]
  if ('achados' in parsed) return (parsed.achados as AgentAchado[]) ?? []
  return []
}

// ── Slugs de agentes "meta" (para salvar ata) ────────────────────────────────
const META_AGENTS = new Set(['coordenador'])

// ── Engine principal ──────────────────────────────────────────────────────────

export async function executeAgent(agentSlug: string): Promise<AgentExecutionResult> {
  const db      = supabaseAdmin()
  const startMs = Date.now()

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

  const { data: run } = await db
    .from('ai_agent_runs')
    .insert({ agent_id: typedAgent.id, status: 'running' })
    .select('id')
    .single()

  const runId = run?.id as string | undefined

  try {
    const contextData = await collectData(agentSlug, db)
    const userMessage = `Dados para análise:\n\n${contextData}\n\nRetorne APENAS o JSON solicitado, sem texto adicional.`

    const aiRes = await callAnthropic({
      model:        typedAgent.modelo ?? 'claude-sonnet-4-20250514',
      maxTokens:    4000,
      systemPrompt: typedAgent.prompt_sistema,
      messages:     [{ role: 'user', content: userMessage }],
      temperature:  0.3,
    })

    const responseText = extractText(aiRes)
    const tempoMs      = Date.now() - startMs
    const parsedData   = parseJSON(responseText)

    let achados: AgentAchado[] = []
    let resumo = ''
    let metadata: Record<string, unknown> | null = null

    if (META_AGENTS.has(agentSlug)) {
      metadata = parsedData
      // Coordenador: extrair prioridades como achados
      const prioridades = (parsedData.top_5_prioridades as Array<{
        titulo: string; severidade: string; agente_origem: string; acao_sugerida: string
      }>) ?? []
      achados = prioridades.map(p => ({
        titulo:         p.titulo         ?? '',
        descricao:      `Origem: ${p.agente_origem ?? '?'}`,
        severidade:     (p.severidade    ?? 'media') as AgentAchado['severidade'],
        sugestao:       p.acao_sugerida  ?? '',
        modulo_afetado: p.agente_origem,
      }))
      resumo = String(parsedData.resumo_executivo ?? '')
    } else if (agentSlug === 'auditor') {
      metadata = parsedData
      achados  = (parsedData.achados as AgentAchado[]) ?? []
      resumo   = String(parsedData.recomendacoes_gerais ?? `${achados.length} agente(s) auditado(s).`)
    } else if (agentSlug === 'sugestor') {
      metadata = parsedData
      const sugestoes = (parsedData.sugestoes as Array<{ titulo: string; descricao: string; impacto: string; esforco: string; prioridade: number }>) ?? []
      achados = sugestoes.map(s => ({
        titulo:     s.titulo     ?? '',
        descricao:  s.descricao  ?? '',
        severidade: (s.impacto === 'alto' ? 'alta' : s.impacto === 'medio' ? 'media' : 'baixa') as AgentAchado['severidade'],
        sugestao:   `Esforço: ${s.esforco ?? '?'} | Prioridade: ${s.prioridade ?? '?'}/10`,
        modulo_afetado: (s as Record<string, unknown>).modulo_afetado as string | undefined,
      }))
      resumo = String(parsedData.roadmap_sugerido ?? `${sugestoes.length} sugestão(ões) gerada(s).`)
    } else {
      achados = (parsedData.achados as AgentAchado[]) ?? []
      metadata = Object.keys(parsedData).length > 1 ? parsedData : null
      resumo  = achados.length > 0
        ? `${achados.length} achado(s): ${achados.filter(a => a.severidade === 'critica').length} crítico(s), ${achados.filter(a => a.severidade === 'alta').length} alto(s).`
        : 'Nenhum achado identificado nesta execução.'
    }

    const severidadeMax = parseSeveridade(achados)

    await db.from('ai_agent_reports').insert({
      agent_id:          typedAgent.id,
      achados,
      resumo,
      severidade_max:    severidadeMax,
      status:            'novo',
      tokens_input:      aiRes.usage.input_tokens,
      tokens_output:     aiRes.usage.output_tokens,
      custo_usd:         aiRes.costUsd,
      tempo_execucao_ms: tempoMs,
      metadata,
    })

    if (agentSlug === 'coordenador' && parsedData) {
      // Buscar todos os agentes ativos para a lista de participantes
      const { data: agentsAtivos } = await db.from('ai_agents').select('slug').eq('ativo', true)
      await db.from('ai_agent_meetings').insert({
        titulo:           `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
        participantes:    (agentsAtivos ?? []).map((a: { slug: string }) => a.slug),
        resumo_executivo: String(parsedData.resumo_executivo ?? ''),
        ata:              responseText,
        decisoes:         parsedData.top_5_prioridades ?? [],
        conflitos:        parsedData.conflitos          ?? [],
        proximos_passos:  parsedData.proximos_passos    ?? [],
      })
    }

    if (runId) {
      await db.from('ai_agent_runs').update({
        status:        'completed',
        tokens_input:  aiRes.usage.input_tokens,
        tokens_output: aiRes.usage.output_tokens,
        custo_usd:     aiRes.costUsd,
        finished_at:   new Date().toISOString(),
      }).eq('id', runId)
    }

    return { agentSlug, achados, resumo, severidadeMax, tokensInput: aiRes.usage.input_tokens, tokensOutput: aiRes.usage.output_tokens, custoUsd: aiRes.costUsd, tempoMs }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (runId) {
      await db.from('ai_agent_runs').update({ status: 'failed', erro: msg, finished_at: new Date().toISOString() }).eq('id', runId)
    }
    throw err
  }
}
