/**
 * POST /api/admin/agentes/executar-todos
 * Executa todos os agentes ativos sequencialmente e faz stream de progresso via SSE.
 */
import { NextRequest }                             from 'next/server'
import { requireAdmin }                            from '@/lib/admin-guard'
import { executeAllAgents, type AgentQueueEvent }  from '@/lib/services/agent-queue'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status:  guard.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: AgentQueueEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // cliente desconectou — ignorar
        }
      }

      try {
        await executeAllAgents(send)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[executar-todos] Erro geral na fila:', msg)
        send({
          type: 'queue_done', slug: '', nome: '', current: 0, total: 0, progress: '0/0',
          summary: { total: 0, completed: 0, failed: 1, custoTotal: 0, tempoTotal: 0, failedSlugs: ['fila'] },
        })
      } finally {
        try { controller.close() } catch { /* ignorar */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream; charset=utf-8',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',  // Vercel / nginx: desabilitar buffering
    },
  })
}
