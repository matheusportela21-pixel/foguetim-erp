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

/** Salva na fila e dispara processamento assíncrono — não bloqueia o response */
async function enqueueAndProcess(body: MLWebhookPayload & Record<string, unknown>): Promise<void> {
  try {
    await supabaseAdmin().from('webhook_queue').insert({
      topic:          body.topic,
      resource:       body.resource,
      user_id:        String(body.user_id),
      application_id: body.application_id ? String(body.application_id) : null,
      payload:        body,
      status:         'pending',
      received_at:    new Date().toISOString(),
    })
  } catch (err) {
    console.error('[Webhook] Erro ao salvar na fila:', err)
  }

  try {
    await processWebhookAsync(body)
  } catch (err) {
    console.error('[Webhook] Erro no processamento assíncrono:', err)
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
