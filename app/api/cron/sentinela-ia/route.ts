/**
 * GET /api/cron/sentinela-ia
 * Agente Sentinela com IA — executa 3x ao dia (08h, 14h, 22h BRT).
 * Analisa dados acumulados das últimas 8h de sentinela_checks.
 * Schedule: 0 11,17,1 * * * (UTC = 08h, 14h, 22h BRT)
 */
import { NextRequest, NextResponse }                          from 'next/server'
import { executeAgent, type AgentAchado }                    from '@/lib/services/agent-engine'

export const dynamic     = 'force-dynamic'
export const maxDuration = 300

// ── Tipos locais ───────────────────────────────────────────────────────────────

interface CreateThreadParams {
  titulo:           string
  tipo:             string
  iniciadoPor:      string
  conteudoInicial:  string
  severidade:       string
  tags:             string[]
}

interface Thread {
  id: string
}

// Importação condicional — agent-communication pode não existir ainda em todos os ambientes
async function tryCreateThread(params: CreateThreadParams): Promise<Thread | null> {
  try {
    const mod = await import('@/lib/services/agent-communication') as {
      createThread:  (p: CreateThreadParams) => Promise<Thread>
      executeThread: (id: string) => Promise<void>
    }
    return await mod.createThread(params)
  } catch {
    console.warn('[sentinela-ia] agent-communication não disponível — thread não criada')
    return null
  }
}

async function tryExecuteThread(threadId: string): Promise<void> {
  try {
    const mod = await import('@/lib/services/agent-communication') as {
      executeThread: (id: string) => Promise<void>
    }
    await mod.executeThread(threadId)
  } catch {
    console.warn('[sentinela-ia] Falha ao executar thread:', threadId)
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Verificar secret ──────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('[cron/sentinela-ia] Iniciando execução do agente Sentinela com IA')

  // ── Executar agente ───────────────────────────────────────────────────────────
  const result = await executeAgent('sentinela')

  console.log(`[cron/sentinela-ia] Concluído — severidade: ${result.severidadeMax}, achados: ${result.achados.length}`)

  // ── Criar thread se incidente crítico ────────────────────────────────────────
  if (result.severidadeMax === 'critica' && result.achados.length > 0) {
    const achadosCriticos = result.achados.filter((a: AgentAchado) => a.severidade === 'critica')
    const primeiroAchado  = result.achados[0]

    const thread = await tryCreateThread({
      titulo:          `[SENTINELA IA] ${primeiroAchado?.titulo ?? 'Incidente crítico'}`,
      tipo:            'incidente',
      iniciadoPor:     'sentinela',
      conteudoInicial: JSON.stringify(achadosCriticos),
      severidade:      'critica',
      tags:            ['sentinela', 'auto_trigger', 'ia_analysis'],
    })

    if (thread) {
      console.log(`[cron/sentinela-ia] Thread criada: ${thread.id}`)
      tryExecuteThread(thread.id).catch(console.error)
    }
  }

  return NextResponse.json({
    ok:        true,
    agente:    'sentinela',
    severidade: result.severidadeMax,
    achados:   result.achados.length,
    custo_usd: result.custoUsd,
    tempo_ms:  result.tempoMs,
  })
}
