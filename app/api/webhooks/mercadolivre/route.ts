/**
 * POST /api/webhooks/mercadolivre
 * Recebe notificações do ML e responde 200 imediatamente.
 * O processamento real é feito de forma assíncrona em background.
 *
 * GET — usado pelo ML para validar a URL durante o cadastro.
 */
import { NextResponse }          from 'next/server'
import { supabaseAdmin }         from '@/lib/supabase-admin'
import { processWebhookAsync }   from '@/lib/ml/webhook-processor'
import type { MLWebhookPayload } from '@/lib/ml/webhook-processor'

/** Verifica idempotência: retorna true se este resource+topic já foi processado nos últimos 3 minutos */
async function isDuplicate(topic: string, resource: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    const { count } = await supabaseAdmin()
      .from('webhook_queue')
      .select('id', { count: 'exact', head: true })
      .eq('topic', topic)
      .eq('resource', resource)
      .in('status', ['processed', 'pending'])
      .gte('received_at', since)
    return (count ?? 0) > 0
  } catch {
    return false // Em caso de erro na checagem, deixar processar
  }
}

/** Salva na fila e dispara processamento assíncrono — não bloqueia o response */
async function enqueueAndProcess(body: MLWebhookPayload & Record<string, unknown>): Promise<void> {
  // Idempotência: evitar processar o mesmo evento duplicado em < 3 min
  const duplicate = await isDuplicate(body.topic, body.resource)
  if (duplicate) {
    console.log('[Webhook] Evento duplicado ignorado:', body.topic, body.resource)
    return
  }

  let queueId: string | null = null
  try {
    const { data: queued } = await supabaseAdmin().from('webhook_queue').insert({
      topic:          body.topic,
      resource:       body.resource,
      user_id:        String(body.user_id),
      application_id: body.application_id ? String(body.application_id) : null,
      payload:        body,
      status:         'pending',
      received_at:    new Date().toISOString(),
    }).select('id').single()
    queueId = queued?.id ?? null
  } catch (err) {
    console.error('[Webhook] Erro ao salvar na fila:', err)
  }

  try {
    await processWebhookAsync(body)
    // Marcar como processado
    if (queueId) {
      try {
        await supabaseAdmin()
          .from('webhook_queue')
          .update({ status: 'processed', processed_at: new Date().toISOString() })
          .eq('id', queueId)
      } catch { /* non-critical */ }
    }
  } catch (err) {
    console.error('[Webhook] Erro no processamento assíncrono:', err)
    // Marcar como erro para retry manual futuro
    if (queueId) {
      try {
        await supabaseAdmin()
          .from('webhook_queue')
          .update({ status: 'error', error_message: String(err) })
          .eq('id', queueId)
      } catch { /* non-critical */ }
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as MLWebhookPayload & Record<string, unknown>

    // Validar payload mínimo — mas sempre retornar 200 para evitar retry do ML
    if (!body.topic || !body.user_id || !body.resource) {
      console.warn('[Webhook] Payload inválido recebido:', body)
      return NextResponse.json({ status: 'received' }, { status: 200 })
    }

    // Processar em background sem bloquear o response
    void enqueueAndProcess(body)

    // Responder 200 imediatamente — ML exige resposta em < 500ms
    return NextResponse.json({ status: 'received' }, { status: 200 })

  } catch (error) {
    console.error('[Webhook] Erro ao processar request:', error)
    // Retornar 200 mesmo com erro para evitar retry em loop
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }
}

// ML envia GET para validar a URL durante o cadastro no Dev Center
export async function GET() {
  return NextResponse.json({ ok: true, service: 'foguetim-ml-webhook' })
}
