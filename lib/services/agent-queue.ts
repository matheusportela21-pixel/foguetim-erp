/**
 * lib/services/agent-queue.ts
 * Sistema de fila de execução sequencial dos Agentes de IA.
 *
 * Regras:
 * - Execução UM POR VEZ (sequencial) — economiza tokens e evita race conditions
 * - Pausa de 2s entre agentes (rate limit Anthropic)
 * - Se um agente falha: loga e pula, não trava a fila
 * - Coordenador sempre executa por último
 */
import { executeAgent, type AgentExecutionResult } from './agent-engine'
import { supabaseAdmin }                            from '@/lib/supabase-admin'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentQueueEvent {
  type:      'agent_start' | 'agent_done' | 'agent_error' | 'queue_done'
  slug:      string
  nome:      string
  current:   number
  total:     number
  progress:  string  // "3/39"
  result?:   AgentExecutionResult
  error?:    string
  summary?:  QueueSummary
}

export interface QueueSummary {
  total:        number
  completed:    number
  failed:       number
  custoTotal:   number
  tempoTotal:   number
  failedSlugs:  string[]
}

export type QueueEventCallback = (event: AgentQueueEvent) => void

// ── Ordem de execução ─────────────────────────────────────────────────────────
// Regra: dados primeiro (proteção + marketplace), análise depois, meta por último

const EXECUTION_ORDER = [
  // 1. Proteção — coletam dados base do sistema
  'sentinela', 'detetive', 'medico', 'vigia',
  // 2. Marketplace — chamadas ML independentes
  'ml_especialista', 'ml_auth_guardian', 'ml_webhook_inspector',
  'ml_error_patterns', 'ml_tester', 'ml_schema_watcher',
  'ml_novidades', 'ml_feature_coverage',
  // 3. Produto — analisam padrões de uso
  'observador', 'integrador', 'arquiteto', 'guardiao_custos',
  // 4. UX/Docs — experiência e documentação
  'onboarding', 'acessibilidade', 'changelog_agent', 'documentador', 'teste',
  // 5. Blog/SEO — conteúdo e otimização
  'seo_tecnico', 'palavras_chave', 'redator', 'editor', 'reciclador',
  // 6. Marketing/Marca — crescimento e identidade
  'social_media', 'copywriter', 'growth', 'layout', 'marca', 'concorrencia',
  // 7. Deploy + Compliance
  'deploy', 'uptime', 'lgpd', 'multitenancy',
  // 8. Meta — precisam dos relatórios anteriores; Coordenador SEMPRE por último
  'auditor', 'sugestor', 'coordenador',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ── Engine da fila ────────────────────────────────────────────────────────────

export async function executeAllAgents(
  onEvent: QueueEventCallback,
): Promise<QueueSummary> {
  const db = supabaseAdmin()

  // Buscar agentes ativos
  const { data: activeAgentsData } = await db
    .from('ai_agents')
    .select('slug, nome, ativo')
    .eq('ativo', true)

  const activeSet   = new Set((activeAgentsData ?? []).map((a: { slug: string }) => a.slug))
  const nameBySlug  = Object.fromEntries(
    (activeAgentsData ?? []).map((a: { slug: string; nome: string }) => [a.slug, a.nome]),
  )

  // Montar fila na ordem correta, apenas agentes ativos
  const inOrder = new Set(EXECUTION_ORDER)
  const queue   = EXECUTION_ORDER.filter(slug => activeSet.has(slug))

  // Agentes ativos não previstos na ordem — inserir antes dos meta
  for (const a of (activeAgentsData ?? [])) {
    const ag = a as { slug: string; nome: string }
    if (!inOrder.has(ag.slug)) {
      // Inserir antes do 'auditor' (posição -3 dos meta)
      const insertAt = Math.max(0, queue.length - 3)
      queue.splice(insertAt, 0, ag.slug)
    }
  }

  const total   = queue.length
  const summary: QueueSummary = {
    total, completed: 0, failed: 0, custoTotal: 0, tempoTotal: 0, failedSlugs: [],
  }
  const startTime = Date.now()

  for (let i = 0; i < queue.length; i++) {
    const slug     = queue[i]!
    const nome     = nameBySlug[slug] ?? slug
    const current  = i + 1
    const progress = `${current}/${total}`

    onEvent({ type: 'agent_start', slug, nome, current, total, progress })

    try {
      const result = await executeAgent(slug)
      summary.completed++
      summary.custoTotal += result.custoUsd
      onEvent({ type: 'agent_done', slug, nome, current, total, progress, result })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      summary.failed++
      summary.failedSlugs.push(slug)
      onEvent({ type: 'agent_error', slug, nome, current, total, progress, error })
      console.error(`[agent-queue] Agente "${slug}" falhou:`, error)
    }

    // Pausa entre agentes (exceto o último) — respeitar rate limit Anthropic
    if (i < queue.length - 1) {
      await sleep(2000)
    }
  }

  summary.tempoTotal = Date.now() - startTime

  onEvent({
    type: 'queue_done', slug: '', nome: '', current: total, total,
    progress: `${total}/${total}`, summary,
  })

  return summary
}
