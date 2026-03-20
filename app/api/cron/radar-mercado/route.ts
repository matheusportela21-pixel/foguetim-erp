/**
 * GET /api/cron/radar-mercado
 * Radar diário de novidades: executa ml_novidades e concorrencia.
 * Se encontrar novidades relevantes, cria thread automática.
 * Schedule: 0 12 * * * (12h UTC = 9h BRT)
 */
import { NextRequest, NextResponse }     from 'next/server'
import { executeAgent, type AgentAchado } from '@/lib/services/agent-engine'

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

interface AgentResult {
  slug:       string
  severidade: string
  achados:    number
  custo_usd?: number
  tempo_ms?:  number
  error?:     string
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
    console.warn('[radar-mercado] agent-communication não disponível — thread não criada')
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
    console.warn('[radar-mercado] Falha ao executar thread:', threadId)
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Verificar secret ──────────────────────────────────────────────────────────
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('[cron/radar-mercado] Iniciando radar de mercado')

  const agentSlugs = ['ml_novidades', 'concorrencia'] as const
  const results: AgentResult[] = []

  // ── Executar agentes sequencialmente (evitar rate limits) ───────────────────
  for (const slug of agentSlugs) {
    try {
      console.log(`[cron/radar-mercado] Executando agente: ${slug}`)
      const result = await executeAgent(slug)

      results.push({
        slug,
        severidade: result.severidadeMax,
        achados:    result.achados.length,
        custo_usd:  result.custoUsd,
        tempo_ms:   result.tempoMs,
      })

      // Criar thread se resultado relevante (alta ou crítica)
      const isRelevant =
        ['alta', 'critica'].includes(result.severidadeMax) && result.achados.length > 0

      if (isRelevant) {
        const primeiroAchado = result.achados[0] as AgentAchado | undefined
        const titulo =
          slug === 'ml_novidades'
            ? `[RADAR] Novidade ML: ${primeiroAchado?.titulo ?? ''}`
            : `[RADAR] Movimento do mercado: ${primeiroAchado?.titulo ?? ''}`

        const thread = await tryCreateThread({
          titulo,
          tipo:            'novidade',
          iniciadoPor:     slug,
          conteudoInicial: JSON.stringify(result.achados),
          severidade:      result.severidadeMax,
          tags:            [slug, 'radar_mercado', 'auto_trigger'],
        })

        if (thread) {
          console.log(`[cron/radar-mercado] Thread criada para ${slug}: ${thread.id}`)
          tryExecuteThread(thread.id).catch(console.error)
        }
      }
    } catch (err) {
      const errMsg = String(err)
      console.error(`[cron/radar-mercado] Agente ${slug} falhou:`, err)
      results.push({ slug, severidade: 'desconhecida', achados: 0, error: errMsg })
    }

    // Delay entre agentes para evitar rate limits da API
    await new Promise<void>(r => setTimeout(r, 3000))
  }

  console.log('[cron/radar-mercado] Concluído —', JSON.stringify(results))

  return NextResponse.json({ ok: true, results })
}
