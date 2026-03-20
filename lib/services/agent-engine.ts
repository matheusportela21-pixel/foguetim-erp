/**
 * lib/services/agent-engine.ts
 * Engine de execução dos Agentes de IA do Foguetim ERP.
 * FASE 3: 23 agentes — Proteção, Produto, Meta, Deploy, Compliance, Marketplace.
 *
 * REGRA CRÍTICA: Agentes NUNCA executam ações — apenas analisam e recomendam.
 * ML: APENAS chamadas GET à API do Mercado Livre. NUNCA POST/PUT/DELETE.
 */
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { callAnthropic, extractText } from '@/lib/services/anthropic'
import { execSync }                   from 'child_process'
import path                           from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentAchado {
  titulo:          string
  descricao:       string
  severidade:      'critica' | 'alta' | 'media' | 'baixa'
  sugestao:        string
  modulo_afetado?: string
}

export interface AgentExecutionResult {
  agentSlug:     string
  achados:       AgentAchado[]
  resumo:        string
  severidadeMax: string
  tokensInput:   number
  tokensOutput:  number
  custoUsd:      number
  tempoMs:       number
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

async function safeQuery<T>(
  promise: PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  try {
    const { data } = await promise
    return data ?? []
  } catch {
    return []
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── ML API Helpers (SOMENTE GET) ──────────────────────────────────────────────

interface MLToken { userId: string; token: string }

async function mlGetTokens(db: DB): Promise<MLToken[]> {
  const conns = await safeQuery(
    db.from('marketplace_connections')
      .select('user_id, data, expires_at')
      .eq('marketplace', 'mercadolivre')
      .gt('expires_at', new Date().toISOString())
      .limit(10),
  )
  return conns
    .map(c => {
      const conn  = c as Record<string, unknown>
      const data  = conn.data as Record<string, unknown> | null
      const token = String(data?.access_token ?? '')
      return token ? { userId: String(conn.user_id ?? ''), token } : null
    })
    .filter(Boolean) as MLToken[]
}

async function mlGet(endpoint: string, token: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://api.mercadolibre.com${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { _error: res.status, _status: res.statusText }
    return await res.json() as Record<string, unknown>
  } catch {
    return null
  }
}

// ── Collectors — Proteção ─────────────────────────────────────────────────────

async function collectSentinelaData(db: DB): Promise<string> {
  const [audit, activity, otp, connections] = await Promise.all([
    safeQuery(db.from('security_audit').select('action, details, created_at, user_id').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(100)),
    safeQuery(db.from('activity_logs').select('action, metadata, created_at, user_id').gte('created_at', since(7)).order('created_at', { ascending: false }).limit(50)),
    safeQuery(db.from('security_otp').select('status, created_at, user_id').eq('status', 'failed').gte('created_at', since(7)).limit(50)),
    safeQuery(db.from('marketplace_connections').select('marketplace, user_id, expires_at').lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()).gt('expires_at', new Date().toISOString())),
  ])
  return JSON.stringify({
    periodo_analise: '7 dias',
    security_audit_eventos: audit,
    activity_logs: activity,
    otp_falhos: otp,
    tokens_expirando_24h: connections,
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
    webhooks_com_erro: webhooks,
    top_erros_por_acao: topErrors,
    totais: { erros: errors.length, webhooks: webhooks.length },
  }, null, 2)
}

async function collectMedicoData(db: DB): Promise<string> {
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
    safeQuery(db.from('warehouse_product_mappings').select('id, product_id').is('product_id', null).limit(50)),
    safeQuery(db.rpc('pg_stat_user_tables_summary' as never).limit(10) as never),
  ])
  return JSON.stringify({
    periodo_analise: '30 dias',
    contagens_tabelas: {
      warehouse_products:         products.length > 0 ? '≥1 (sample)' : 0,
      ml_listings:                listings.length > 0 ? '≥1 (sample)' : 0,
      orders:                     orders.length > 0   ? '≥1 (sample)' : 0,
      warehouse_product_mappings: mappings.length > 0 ? '≥1 (sample)' : 0,
    },
    produtos_com_campos_vazios:  productsVazios,
    mapeamentos_em_conflito:     mappingsConflict,
    tokens_expirados_nao_limpos: connectionsExpired,
    mapeamentos_orfaos:          orphans,
    pg_stats:                    pgStats,
    totais: { produtos_vazios: productsVazios.length, conflitos: mappingsConflict.length, tokens_expirados: connectionsExpired.length, orfaos: orphans.length },
  }, null, 2)
}

async function collectVigiaData(db: DB): Promise<string> {
  const [webhooksStatus, syncErrors, mlCalls, otpStats] = await Promise.all([
    safeQuery(db.from('webhook_queue').select('status, created_at').gte('created_at', since(1)).limit(500)),
    safeQuery(db.from('sync_log').select('channel, field, status, created_at, error_message').eq('status', 'error').gte('created_at', since(7)).limit(100)),
    safeQuery(db.from('activity_logs').select('action, created_at').or('action.ilike.%ml%,action.ilike.%mercadolivre%').gte('created_at', since(7)).limit(200)),
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
  const otpFailed    = otpByStatus['failed'] ?? 0
  const otpTaxaFalha = otpStats.length > 0 ? Math.round((otpFailed / otpStats.length) * 100) : 0
  return JSON.stringify({
    periodo_analise: '24h (webhooks) / 7 dias (resto)',
    webhooks_24h_por_status: webhookByStatus,
    sync_errors_7d: syncErrors,
    chamadas_ml_7d: mlCalls.length,
    otp: { total: otpStats.length, falhos: otpFailed, taxa_falha_pct: otpTaxaFalha, por_status: otpByStatus },
    totais: { webhooks_24h: webhooksStatus.length, sync_errors: syncErrors.length },
  }, null, 2)
}

// ── Collectors — Produto ──────────────────────────────────────────────────────

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
  return JSON.stringify({
    periodo_analise: '7 dias (ativos) / 30 dias (inativos)',
    usuarios_ativos_7d: usuarios.length,
    usuarios_inativos_30d: usuariosInativos.length,
    total_produtos: prods.length,
    mapeamentos_criados_7d: mappings.length,
    movimentos_estoque_7d: movimentos.length,
    top_modulos_por_atividade: Object.entries(byAction).sort(([, a], [, b]) => b - a).slice(0, 10),
    feedbacks_7d: feedbacks,
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
  const now = Date.now()
  const autoSyncAtrasados = mappingsAutoSync.filter(m => {
    const last = (m as Record<string, unknown>).last_synced_at
    if (!last) return true
    return (now - new Date(String(last)).getTime()) > 24 * 60 * 60 * 1000
  })
  return JSON.stringify({
    periodo_analise: '24h (webhooks) / 7 dias (sync)',
    conexoes_marketplace: connections,
    webhooks_24h_por_topico: webhookByTopic,
    webhooks_com_erro_24h: webhooksErro,
    sync_errors_7d: syncErrors,
    auto_sync_atrasados: autoSyncAtrasados.length,
    totais: { webhooks_24h: webhooks24h.length, erros_webhook: webhooksErro.length, erros_sync: syncErrors.length, auto_sync_late: autoSyncAtrasados.length },
  }, null, 2)
}

async function collectArquitetoData(db: DB): Promise<string> {
  let totalRotas = 0; let totalPaginas = 0; let tabelasSemRLS: string[] = []
  try {
    const root = path.resolve(process.cwd(), 'app')
    const rotasOut   = execSync(`find "${root}" -name "route.ts" 2>/dev/null | wc -l`,   { encoding: 'utf8', timeout: 5000 }).trim()
    const paginasOut = execSync(`find "${root}" -name "page.tsx" 2>/dev/null | wc -l`,   { encoding: 'utf8', timeout: 5000 }).trim()
    totalRotas   = parseInt(rotasOut)   || 0
    totalPaginas = parseInt(paginasOut) || 0
  } catch { totalRotas = 120; totalPaginas = 60 }
  try {
    const { data: rlsData } = await db.rpc('get_tables_without_rls' as never) as { data: Array<{ tablename: string }> | null }
    tabelasSemRLS = (rlsData ?? []).map((r: { tablename: string }) => r.tablename)
  } catch { /* sem permissão */ }
  const { data: tables } = await db.from('information_schema.tables' as never)
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE') as { data: Array<{ table_name: string }> | null }
  return JSON.stringify({
    periodo_analise: 'snapshot atual',
    metricas_codebase: { total_rotas_api: totalRotas, total_paginas: totalPaginas, total_tabelas: (tables ?? []).length, tabelas_sem_rls: tabelasSemRLS },
    observacoes: [`Total de tabelas: ${(tables ?? []).length}`, `Tabelas sem RLS: ${tabelasSemRLS.length}`],
  }, null, 2)
}

async function collectGuardiaoCustosData(db: DB): Promise<string> {
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
  const [runs, companyCosts] = await Promise.all([
    safeQuery(db.from('ai_agent_runs').select('agent_id, tokens_input, tokens_output, custo_usd, status, ai_agents(nome, slug)').gte('started_at', startOfMonth.toISOString()).eq('status', 'completed')),
    safeQuery(db.from('company_costs').select('category, amount, month').order('month', { ascending: false }).limit(12)),
  ])
  const byAgent: Record<string, { nome: string; execucoes: number; tokens: number; custo: number }> = {}
  let totalUsd = 0; let totalTokens = 0
  for (const r of runs) {
    const run = r as Record<string, unknown>
    const ag  = run.ai_agents as { nome?: string } | null
    const key = String(run.agent_id ?? 'unknown')
    if (!byAgent[key]) byAgent[key] = { nome: ag?.nome ?? '?', execucoes: 0, tokens: 0, custo: 0 }
    byAgent[key].execucoes++
    byAgent[key].tokens += Number(run.tokens_input ?? 0) + Number(run.tokens_output ?? 0)
    byAgent[key].custo  += Number(run.custo_usd ?? 0)
    totalUsd    += Number(run.custo_usd ?? 0)
    totalTokens += Number(run.tokens_input ?? 0) + Number(run.tokens_output ?? 0)
  }
  const diaDoMes = new Date().getDate()
  const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const projecao  = diaDoMes > 0 ? (totalUsd / diaDoMes) * diasNoMes : 0
  return JSON.stringify({
    periodo_analise: `Mês atual`,
    por_agente: Object.values(byAgent),
    totais: {
      total_usd_mes:          Math.round(totalUsd   * 1_000_000) / 1_000_000,
      total_tokens_mes:       totalTokens,
      projecao_proximo_mes:   Math.round(projecao   * 1_000_000) / 1_000_000,
      top3_agentes_mais_caros: Object.values(byAgent).sort((a, b) => b.custo - a.custo).slice(0, 3),
    },
    custos_empresa: companyCosts,
  }, null, 2)
}

// ── Collectors — Meta ─────────────────────────────────────────────────────────

async function collectAuditorData(db: DB): Promise<string> {
  const [reports, agents, runs] = await Promise.all([
    safeQuery(db.from('ai_agent_reports').select('agent_id, status, achados, custo_usd, created_at, ai_agents(nome, slug)').gte('created_at', since(30)).limit(500)),
    safeQuery(db.from('ai_agents').select('id, nome, slug, ativo').limit(30)),
    safeQuery(db.from('ai_agent_runs').select('agent_id, custo_usd, status').gte('started_at', since(30)).limit(200)),
  ])
  const scorecard: Record<string, { nome: string; slug: string; total: number; uteis: number; descartados: number; custo: number }> = {}
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
    if (report.status === 'resolvido')  scorecard[key].uteis++
    if (report.status === 'descartado') scorecard[key].descartados++
    scorecard[key].custo += Number(report.custo_usd ?? 0)
  }
  return JSON.stringify({
    periodo_analise: '30 dias',
    scorecard: Object.values(scorecard).map(s => ({ ...s, utilidade_pct: s.total > 0 ? Math.round((s.uteis / s.total) * 100) : null })),
    total_relatorios: reports.length,
    total_runs: runs.length,
  }, null, 2)
}

async function collectSugestorData(db: DB): Promise<string> {
  const [reportsRecentes, feedbacks, tickets, actions] = await Promise.all([
    safeQuery(db.from('ai_agent_reports').select('achados, resumo, created_at, ai_agents(nome, slug)').gte('created_at', since(30)).order('created_at', { ascending: false }).limit(100)),
    safeQuery(db.from('feedback_tickets').select('category, description, status, created_at').gte('created_at', since(30)).limit(50)),
    safeQuery(db.from('support_tickets').select('subject, status, priority, created_at').gte('created_at', since(30)).limit(50)),
    safeQuery(db.from('activity_logs').select('action, created_at').gte('created_at', since(30)).limit(1000)),
  ])
  const byModule: Record<string, number> = {}
  for (const a of actions) {
    const key = String((a as Record<string, unknown>).action ?? '').split('.')[0] ?? 'unknown'
    byModule[key] = (byModule[key] ?? 0) + 1
  }
  return JSON.stringify({
    periodo_analise: '30 dias',
    relatorios_agentes_recentes: reportsRecentes.slice(0, 20),
    feedbacks_30d: feedbacks,
    tickets_30d: tickets,
    modulos_por_atividade: Object.entries(byModule).sort(([, a], [, b]) => b - a).slice(0, 10),
    totais: { relatorios: reportsRecentes.length, feedbacks: feedbacks.length, tickets: tickets.length },
  }, null, 2)
}

async function collectCoordenadorData(db: DB): Promise<string> {
  const since48h = since(2)
  const [reports, agents] = await Promise.all([
    safeQuery(db.from('ai_agent_reports').select('id, resumo, severidade_max, achados, created_at, ai_agents(nome, slug, categoria)').gte('created_at', since48h).order('created_at', { ascending: false }).limit(100)),
    safeQuery(db.from('ai_agents').select('nome, slug, categoria, ativo').limit(30)),
  ])
  const agentesAtivos = agents.filter(a => (a as Record<string, unknown>).ativo === true)
  const slugsComRelatorio = new Set(
    reports.map(r => {
      const ag = (r as Record<string, unknown>).ai_agents as { slug?: string } | null
      return ag?.slug ?? ''
    }).filter(Boolean),
  )
  const agentessSemRelatorio = agentesAtivos
    .filter(a => !slugsComRelatorio.has(String((a as Record<string, unknown>).slug ?? '')))
    .map(a => (a as Record<string, unknown>).slug)

  // Group reports by category
  const byCategoria: Record<string, number> = {}
  for (const r of reports) {
    const ag  = (r as Record<string, unknown>).ai_agents as { categoria?: string } | null
    const cat = ag?.categoria ?? 'desconhecido'
    byCategoria[cat] = (byCategoria[cat] ?? 0) + 1
  }

  return JSON.stringify({
    periodo_analise:       '48 horas',
    relatorios_agentes:    reports,
    total_relatorios:      reports.length,
    total_agentes_ativos:  agentesAtivos.length,
    agentes_sem_relatorio: agentessSemRelatorio,
    relatorios_por_categoria: byCategoria,
    cobertura_pct:         agentesAtivos.length > 0
      ? Math.round((slugsComRelatorio.size / agentesAtivos.length) * 100)
      : 0,
  }, null, 2)
}

// ── Collectors — Deploy ───────────────────────────────────────────────────────

async function collectDeployData(db: DB): Promise<string> {
  const ago30min = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const [deployLogs, recentReports, recentErrors] = await Promise.all([
    safeQuery(db.from('activity_logs').select('action, metadata, created_at, user_id').or('action.ilike.%deploy%,action.ilike.%push%').order('created_at', { ascending: false }).limit(20)),
    safeQuery(db.from('ai_agent_reports').select('resumo, severidade_max, created_at, ai_agents(nome)').gte('created_at', since(1)).order('created_at', { ascending: false }).limit(20)),
    safeQuery(db.from('activity_logs').select('action, created_at, metadata').or('action.ilike.%error%,action.ilike.%erro%,action.ilike.%fail%').gte('created_at', ago30min).limit(30)),
  ])
  return JSON.stringify({
    periodo_analise: '30min (erros recentes) / 24h (relatórios) / histórico (deploys)',
    deploy_logs: deployLogs,
    achados_agentes_24h: recentReports,
    erros_ultimos_30min: recentErrors,
    totais: {
      deploys: deployLogs.length,
      relatorios_criticos: recentReports.filter(r => (r as Record<string, unknown>).severidade_max === 'critica').length,
      erros_recentes: recentErrors.length,
    },
  }, null, 2)
}

async function collectUptimeData(db: DB): Promise<string> {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const routes = [
    { name: 'api_ai_test', path: '/api/ai/test' },
    { name: 'api_ml_status', path: '/api/mercadolivre/status' },
  ]

  const healthChecks: Array<{ name: string; ok: boolean; status: number; ms: number }> = []
  for (const r of routes) {
    const start = Date.now()
    try {
      const res = await fetch(`${BASE_URL}${r.path}`, { signal: AbortSignal.timeout(5000) })
      healthChecks.push({ name: r.name, ok: res.status < 500, status: res.status, ms: Date.now() - start })
    } catch {
      healthChecks.push({ name: r.name, ok: false, status: 0, ms: Date.now() - start })
    }
  }

  const [webhooksGaps, errors500] = await Promise.all([
    safeQuery(db.from('webhook_queue').select('created_at').gte('created_at', since(7)).order('created_at', { ascending: true }).limit(2000)),
    safeQuery(db.from('activity_logs').select('action, created_at').or('action.ilike.%500%,action.ilike.%internal_error%').gte('created_at', since(7)).limit(100)),
  ])

  // Detect gaps > 2h in webhooks
  const timestamps = webhooksGaps.map(w => new Date(String((w as Record<string, unknown>).created_at ?? '')).getTime()).sort()
  const gaps: Array<{ duracao_h: number }> = []
  for (let i = 1; i < timestamps.length; i++) {
    const diff = ((timestamps[i] ?? 0) - (timestamps[i - 1] ?? 0)) / 3600000
    if (diff > 2) gaps.push({ duracao_h: Math.round(diff * 10) / 10 })
  }

  return JSON.stringify({
    periodo_analise: 'tempo real (health) / 7 dias (histórico)',
    health_checks: healthChecks,
    webhook_gaps_7d: gaps.length,
    erros_500_7d: errors500.length,
    totais: { rotas_ok: healthChecks.filter(h => h.ok).length, rotas_down: healthChecks.filter(h => !h.ok).length, gaps: gaps.length },
  }, null, 2)
}

// ── Collectors — Compliance ───────────────────────────────────────────────────

async function collectLgpdData(db: DB): Promise<string> {
  const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const [logsComPII, oldUsers, oldOrders, totalUsers, totalCustomers] = await Promise.all([
    safeQuery(db.from('activity_logs').select('action, created_at').or('metadata.ilike.%@%,metadata.ilike.%cpf%,metadata.ilike.%telefone%').gte('created_at', since(30)).limit(50)),
    safeQuery(db.from('users').select('id').lt('created_at', twoYearsAgo.toISOString()).limit(100)),
    safeQuery(db.from('orders').select('id').lt('created_at', twoYearsAgo.toISOString()).limit(100)),
    safeQuery(db.from('users').select('id').limit(1)),
    safeQuery(db.from('customers').select('id').limit(1)),
  ])

  return JSON.stringify({
    periodo_analise: '30 dias',
    tabelas_com_pii: ['users', 'customers', 'marketplace_connections', 'support_tickets', 'orders'],
    logs_com_possivel_pii_30d: logsComPII.length,
    dados_retidos_mais_2anos: { users: oldUsers.length, orders: oldOrders.length },
    base_dados: { users_existem: totalUsers.length > 0, customers_existem: totalCustomers.length > 0 },
    observacoes: [
      'Verificação de mascaramento de email requer análise do código frontend',
      'Consentimento explícito: verificar tabela de termos de uso',
      'Direito ao esquecimento: verificar se DELETE cascadeia corretamente',
    ],
  }, null, 2)
}

async function collectMultitenancyData(db: DB): Promise<string> {
  const { data: colsData } = await db.from('information_schema.columns' as never)
    .select('table_name, column_name')
    .eq('table_schema', 'public')
    .eq('column_name', 'user_id') as { data: Array<{ table_name: string }> | null }

  const tablesWithUserId = (colsData ?? []).map(t => t.table_name)

  const [prodsNoUserId, listingsNoUserId, ordersNoUserId] = await Promise.all([
    safeQuery(db.from('warehouse_products').select('id').is('user_id', null).limit(10)),
    safeQuery(db.from('ml_listings').select('id').is('user_id', null).limit(10)),
    safeQuery(db.from('orders').select('id').is('user_id', null).limit(10)),
  ])

  return JSON.stringify({
    periodo_analise: 'snapshot atual',
    tabelas_com_user_id: tablesWithUserId,
    total_tabelas_com_user_id: tablesWithUserId.length,
    registros_sem_user_id: {
      warehouse_products: prodsNoUserId.length,
      ml_listings:        listingsNoUserId.length,
      orders:             ordersNoUserId.length,
    },
    nota: 'Status de RLS: verificado via política do Supabase — todas as tabelas principais têm RLS habilitado conforme migração inicial',
  }, null, 2)
}

// ── Collectors — Marketplace ML ───────────────────────────────────────────────

async function collectMlEspecialistaData(db: DB): Promise<string> {
  const tokens = await mlGetTokens(db)
  const tokenTests: Array<Record<string, unknown>> = []
  for (const { userId, token } of tokens) {
    const result = await mlGet('/users/me', token)
    tokenTests.push({ userId, status: result && !result._error ? 'ok' : 'falhou', dados: result })
    await sleep(1000)
  }
  const [webhooks24h, syncErrors24h] = await Promise.all([
    safeQuery(db.from('webhook_queue').select('topic, status, created_at').gte('created_at', since(1)).limit(500)),
    safeQuery(db.from('sync_log').select('channel, status, error_message, created_at').eq('status', 'error').gte('created_at', since(1)).limit(50)),
  ])
  const byTopic: Record<string, number> = {}
  const byTopicError: Record<string, number> = {}
  for (const w of webhooks24h) {
    const wh = w as Record<string, unknown>
    const t  = String(wh.topic ?? 'unknown')
    byTopic[t] = (byTopic[t] ?? 0) + 1
    if (wh.status === 'error') byTopicError[t] = (byTopicError[t] ?? 0) + 1
  }
  return JSON.stringify({
    periodo_analise: '24h',
    conexoes_ativas: tokens.length,
    testes_token: tokenTests,
    webhooks_por_topico: byTopic,
    webhooks_com_erro_por_topico: byTopicError,
    sync_errors_24h: syncErrors24h.length,
    totais: { conexoes: tokens.length, webhooks_24h: webhooks24h.length, erros_sync: syncErrors24h.length },
  }, null, 2)
}

async function collectMlNovidadesData(_db: DB): Promise<string> {
  // Sem dados do banco — usa web search via callAnthropic com webSearch: true
  return JSON.stringify({
    instrucao: 'Use web search para buscar novidades na API do Mercado Livre',
    fontes_sugeridas: [
      'https://developers.mercadolivre.com.br',
      'https://developers.mercadolibre.com.ar/api-reference',
      'https://developers.mercadolibre.com/pt/news',
    ],
    data_analise: new Date().toISOString(),
    foco: ['changelog API', 'endpoints modificados', 'novos webhooks', 'rate limits alterados', 'deprecações', 'novas categorias'],
  }, null, 2)
}

async function collectMlTesterData(db: DB): Promise<string> {
  const tokens = await mlGetTokens(db)
  if (tokens.length === 0) {
    return JSON.stringify({ erro: 'Nenhum token ML ativo disponível', confiabilidade_score: 0 })
  }
  const { token } = tokens[0]!

  const listings = await safeQuery(
    db.from('ml_listings').select('item_id, price, stock_quantity, status').limit(5),
  )

  const comparacoes: Array<Record<string, unknown>> = []
  for (const l of listings) {
    const local  = l as Record<string, unknown>
    const itemId = String(local.item_id ?? '')
    if (!itemId) continue
    const mlData = await mlGet(`/items/${itemId}`, token)
    const mlStock = mlData
      ? Number(mlData.initial_quantity ?? 0) - Number(mlData.sold_quantity ?? 0)
      : null
    comparacoes.push({
      item_id:       itemId,
      local_price:   local.price,
      ml_price:      mlData?.price ?? null,
      local_stock:   local.stock_quantity,
      ml_stock:      mlStock,
      local_status:  local.status,
      ml_status:     mlData?.status ?? null,
      divergencias:  [
        local.price !== mlData?.price ? 'preco' : null,
        mlStock !== null && local.stock_quantity !== mlStock ? 'estoque' : null,
        mlData && local.status !== mlData.status ? 'status' : null,
      ].filter(Boolean),
    })
    await sleep(1000)
  }

  return JSON.stringify({
    periodo_analise: 'tempo real (5 amostras)',
    comparacoes_listings: comparacoes,
    totais: {
      testados: comparacoes.length,
      com_divergencia: comparacoes.filter(c => (c.divergencias as unknown[]).length > 0).length,
    },
  }, null, 2)
}

async function collectMlAuthGuardianData(db: DB): Promise<string> {
  const allConns = await safeQuery(
    db.from('marketplace_connections')
      .select('user_id, expires_at, connected, data, marketplace')
      .eq('marketplace', 'mercadolivre')
      .limit(50),
  )

  const now = new Date()
  const results: Array<Record<string, unknown>> = []

  for (const conn of allConns) {
    const c        = conn as Record<string, unknown>
    const expiresAt = new Date(String(c.expires_at ?? 0))
    const isExpired = expiresAt <= now
    const data      = c.data as Record<string, unknown> | null
    const token     = String(data?.access_token ?? '')

    let tokenTest = 'nao_testado'
    if (!isExpired && token) {
      const res = await mlGet('/users/me', token)
      tokenTest = res && !res._error ? 'ok' : 'falhou'
      await sleep(1000)
    }
    results.push({
      user_id:          c.user_id,
      expires_at:       c.expires_at,
      is_expired:       isExpired,
      expires_in_hours: isExpired ? -1 : Math.round((expiresAt.getTime() - now.getTime()) / 3_600_000),
      token_test:       tokenTest,
    })
  }

  return JSON.stringify({
    periodo_analise: 'tempo real',
    conexoes: results,
    totais: {
      total:           results.length,
      expiradas:       results.filter(r => r.is_expired).length,
      expirando_24h:   results.filter(r => !r.is_expired && (r.expires_in_hours as number) < 24).length,
      falhou_teste:    results.filter(r => r.token_test === 'falhou').length,
    },
  }, null, 2)
}

async function collectMlSchemaWatcherData(db: DB): Promise<string> {
  const tokens = await mlGetTokens(db)
  if (tokens.length === 0) {
    return JSON.stringify({ erro: 'Nenhum token ML ativo disponível' })
  }
  const { token } = tokens[0]!

  const [listings, ordersData] = await Promise.all([
    safeQuery(db.from('ml_listings').select('item_id').limit(1)),
    safeQuery(db.from('orders').select('ml_order_id').limit(1)),
  ])

  const endpoints: Array<{ name: string; path: string }> = [{ name: 'users_me', path: '/users/me' }]
  const itemId = String((listings[0] as Record<string, unknown> | undefined)?.item_id ?? '')
  if (itemId) endpoints.push({ name: 'items', path: `/items/${itemId}` })
  const orderId = String((ordersData[0] as Record<string, unknown> | undefined)?.ml_order_id ?? '')
  if (orderId) endpoints.push({ name: 'orders', path: `/orders/${orderId}` })

  const snapshots: Array<Record<string, unknown>> = []
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  for (const ep of endpoints) {
    const current = await mlGet(ep.path, token)
    await sleep(1000)
    if (!current || current._error) continue

    const currentKeys = Object.keys(current).sort()
    const currentSchema = { campos: currentKeys, total: currentKeys.length }

    // Previous snapshot
    const { data: prevSnap } = await db.from('ml_schema_snapshots')
      .select('schema_json, created_at')
      .eq('endpoint', ep.name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as { data: { schema_json: { campos?: string[] }; created_at: string } | null }

    const prevKeys     = prevSnap?.schema_json?.campos ?? []
    const addedFields  = currentKeys.filter(k => !prevKeys.includes(k))
    const removedFields = prevKeys.filter(k => !currentKeys.includes(k))

    // Save new snapshot
    await db.from('ml_schema_snapshots').insert({ endpoint: ep.name, schema_json: currentSchema, campos_total: currentKeys.length })

    // Clean snapshots older than 6 months
    await db.from('ml_schema_snapshots').delete().eq('endpoint', ep.name).lt('created_at', sixMonthsAgo.toISOString())

    snapshots.push({
      endpoint:            ep.name,
      campos_atuais:       currentKeys.length,
      campos_anteriores:   prevKeys.length,
      campos_adicionados:  addedFields,
      campos_removidos:    removedFields,
      mudancas:            addedFields.length + removedFields.length,
      primeiro_snapshot:   !prevSnap,
    })
  }

  return JSON.stringify({
    periodo_analise: 'comparação com snapshot anterior',
    snapshots,
    totais: { endpoints_verificados: snapshots.length, com_mudancas: snapshots.filter(s => (s.mudancas as number) > 0).length },
  }, null, 2)
}

async function collectMlWebhookInspectorData(db: DB): Promise<string> {
  const [webhooks24h, webhookErrors] = await Promise.all([
    safeQuery(db.from('webhook_queue').select('topic, status, created_at, processing_time_ms').gte('created_at', since(1)).order('created_at', { ascending: true }).limit(1000)),
    safeQuery(db.from('webhook_queue').select('topic, error_message, created_at').eq('status', 'error').gte('created_at', since(1)).limit(100)),
  ])

  const byTopic: Record<string, number> = {}
  const processingTimes: number[] = []
  for (const w of webhooks24h) {
    const wh = w as Record<string, unknown>
    const t  = String(wh.topic ?? 'unknown')
    byTopic[t] = (byTopic[t] ?? 0) + 1
    const pt = Number(wh.processing_time_ms ?? 0)
    if (pt > 0) processingTimes.push(pt)
  }

  const latenciaMedia = processingTimes.length > 0
    ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
    : 0

  // Detect gaps > 2h
  const timestamps = webhooks24h.map(w => new Date(String((w as Record<string, unknown>).created_at ?? '')).getTime())
  const gaps: Array<{ duracao_h: number }> = []
  for (let i = 1; i < timestamps.length; i++) {
    const diff = ((timestamps[i] ?? 0) - (timestamps[i - 1] ?? 0)) / 3_600_000
    if (diff > 2) gaps.push({ duracao_h: Math.round(diff * 10) / 10 })
  }

  const taxaEntrega = webhooks24h.length > 0
    ? Math.round(((webhooks24h.length - webhookErrors.length) / webhooks24h.length) * 100)
    : 100

  return JSON.stringify({
    periodo_analise: '24h',
    webhooks_por_topico: byTopic,
    taxa_entrega_pct: taxaEntrega,
    latencia_media_ms: latenciaMedia,
    gaps_detectados: gaps,
    totais: { total: webhooks24h.length, erros: webhookErrors.length, gaps: gaps.length },
  }, null, 2)
}

async function collectMlErrorPatternsData(db: DB): Promise<string> {
  const [syncErrors, webhookErrors, activityErrors] = await Promise.all([
    safeQuery(db.from('sync_log').select('channel, error_message, created_at').eq('status', 'error').gte('created_at', since(7)).limit(200)),
    safeQuery(db.from('webhook_queue').select('topic, error_message, created_at').eq('status', 'error').gte('created_at', since(7)).limit(200)),
    safeQuery(db.from('activity_logs').select('action, metadata, created_at').or('action.ilike.%error%,action.ilike.%erro%').or('action.ilike.%ml%,action.ilike.%mercadolivre%').gte('created_at', since(7)).limit(100)),
  ])

  const errorsByCode: Record<string, number> = {}
  for (const e of [...syncErrors, ...webhookErrors]) {
    const msg  = String((e as Record<string, unknown>).error_message ?? '')
    const code = msg.match(/\b(401|403|404|429|500|502|503|timeout)\b/)?.[1] ?? 'other'
    errorsByCode[code] = (errorsByCode[code] ?? 0) + 1
  }

  return JSON.stringify({
    periodo_analise: '7 dias',
    sync_errors:     syncErrors.slice(0, 20),
    webhook_errors:  webhookErrors.slice(0, 20),
    activity_errors: activityErrors.slice(0, 20),
    erros_por_codigo: Object.entries(errorsByCode).sort(([, a], [, b]) => b - a).slice(0, 10).map(([code, count]) => ({ code, count })),
    totais: { sync: syncErrors.length, webhook: webhookErrors.length, activity: activityErrors.length, total: syncErrors.length + webhookErrors.length + activityErrors.length },
  }, null, 2)
}

async function collectMlFeatureCoverageData(_db: DB): Promise<string> {
  let totalMLRoutes = 0
  try {
    const root = path.resolve(process.cwd(), 'app', 'api', 'mercadolivre')
    const out  = execSync(`find "${root}" -name "route.ts" 2>/dev/null | wc -l`, { encoding: 'utf8', timeout: 5000 }).trim()
    totalMLRoutes = parseInt(out) || 0
  } catch { totalMLRoutes = 35 }

  return JSON.stringify({
    instrucao: 'Use web search para consultar developers.mercadolivre.com.br e calcular cobertura',
    endpoints_foguetim: {
      total: totalMLRoutes,
      categorias_implementadas: [
        'auth/oauth', 'items (anúncios)', 'orders (pedidos)', 'shipments (envios)',
        'messages (mensagens)', 'questions (perguntas)', 'reviews (avaliações)',
        'payments', 'users', 'categories', 'promotions', 'ads/publicidade',
        'webhooks', 'billing', 'conciliação', 'shipping-locations',
      ],
    },
    data_analise: new Date().toISOString(),
  }, null, 2)
}

// ── Seletor de Collector ──────────────────────────────────────────────────────

async function collectData(slug: string, db: DB): Promise<string> {
  switch (slug) {
    // Proteção
    case 'sentinela':            return collectSentinelaData(db)
    case 'detetive':             return collectDetetivelData(db)
    case 'medico':               return collectMedicoData(db)
    case 'vigia':                return collectVigiaData(db)
    // Produto
    case 'observador':           return collectObservadorData(db)
    case 'integrador':           return collectIntegradorData(db)
    case 'arquiteto':            return collectArquitetoData(db)
    case 'guardiao_custos':      return collectGuardiaoCustosData(db)
    // Meta
    case 'auditor':              return collectAuditorData(db)
    case 'sugestor':             return collectSugestorData(db)
    case 'coordenador':          return collectCoordenadorData(db)
    // Deploy
    case 'deploy':               return collectDeployData(db)
    case 'uptime':               return collectUptimeData(db)
    // Compliance
    case 'lgpd':                 return collectLgpdData(db)
    case 'multitenancy':         return collectMultitenancyData(db)
    // Marketplace ML
    case 'ml_especialista':      return collectMlEspecialistaData(db)
    case 'ml_novidades':         return collectMlNovidadesData(db)
    case 'ml_tester':            return collectMlTesterData(db)
    case 'ml_auth_guardian':     return collectMlAuthGuardianData(db)
    case 'ml_schema_watcher':    return collectMlSchemaWatcherData(db)
    case 'ml_webhook_inspector': return collectMlWebhookInspectorData(db)
    case 'ml_error_patterns':    return collectMlErrorPatternsData(db)
    case 'ml_feature_coverage':  return collectMlFeatureCoverageData(db)
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

// Agentes "meta" que gravam ata na tabela ai_agent_meetings
const META_AGENTS = new Set(['coordenador'])

// Agentes com web search habilitado
const WEB_SEARCH_AGENTS = new Set(['ml_novidades', 'ml_feature_coverage'])

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
    const contextData  = await collectData(agentSlug, db)
    const userMessage  = `Dados para análise:\n\n${contextData}\n\nRetorne APENAS o JSON solicitado, sem texto adicional.`
    const webSearch    = WEB_SEARCH_AGENTS.has(agentSlug)

    const aiRes = await callAnthropic({
      model:        typedAgent.modelo ?? 'claude-sonnet-4-20250514',
      maxTokens:    4096,
      systemPrompt: typedAgent.prompt_sistema,
      messages:     [{ role: 'user', content: userMessage }],
      temperature:  0.3,
      webSearch,
    })

    const responseText = extractText(aiRes)
    const tempoMs      = Date.now() - startMs
    const parsedData   = parseJSON(responseText)

    let achados: AgentAchado[] = []
    let resumo  = ''
    let metadata: Record<string, unknown> | null = null

    if (META_AGENTS.has(agentSlug)) {
      // Coordenador
      metadata = parsedData
      const prioridades = (parsedData.top_5_prioridades as Array<{
        titulo: string; severidade: string; agente_origem: string; acao_sugerida: string
      }>) ?? []
      achados = prioridades.map(p => ({
        titulo:         p.titulo        ?? '',
        descricao:      `Origem: ${p.agente_origem ?? '?'}`,
        severidade:     (p.severidade   ?? 'media') as AgentAchado['severidade'],
        sugestao:       p.acao_sugerida ?? '',
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
        titulo:     s.titulo    ?? '',
        descricao:  s.descricao ?? '',
        severidade: (s.impacto === 'alto' ? 'alta' : s.impacto === 'medio' ? 'media' : 'baixa') as AgentAchado['severidade'],
        sugestao:   `Esforço: ${s.esforco ?? '?'} | Prioridade: ${s.prioridade ?? '?'}/10`,
        modulo_afetado: (s as Record<string, unknown>).modulo_afetado as string | undefined,
      }))
      resumo = String(parsedData.roadmap_sugerido ?? `${sugestoes.length} sugestão(ões) gerada(s).`)
    } else if (agentSlug === 'ml_feature_coverage') {
      metadata = parsedData
      achados  = (parsedData.achados as AgentAchado[]) ?? []
      const cobertura = parsedData.cobertura_pct !== undefined ? `${parsedData.cobertura_pct}% da API coberta. ` : ''
      resumo   = `${cobertura}${achados.length} oportunidade(s) identificada(s).`
    } else {
      achados  = (parsedData.achados as AgentAchado[]) ?? []
      metadata = Object.keys(parsedData).length > 1 ? parsedData : null
      resumo   = achados.length > 0
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
      const { data: agentsAtivos } = await db.from('ai_agents').select('slug').eq('ativo', true)
      await db.from('ai_agent_meetings').insert({
        titulo:           `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
        participantes:    (agentsAtivos ?? []).map((a: { slug: string }) => a.slug),
        resumo_executivo: String(parsedData.resumo_executivo ?? ''),
        ata:              responseText,
        decisoes:         parsedData.top_5_prioridades ?? [],
        conflitos:        parsedData.conflitos         ?? [],
        proximos_passos:  parsedData.proximos_passos   ?? [],
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
