/**
 * POST /api/webhooks/mercadolivre
 * Recebe notificações do ML e responde 200 imediatamente.
 * O processamento real é feito de forma assíncrona em background.
 *
 * GET — usado pelo ML para validar a URL durante o cadastro.
 *
 * Segurança: valida x-signature (HMAC-SHA256) quando ML_WEBHOOK_SECRET está configurado.
 * Template assinado: "id:<_id>;request-id:<x-request-id>;ts:<ts>"
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { processWebhookAsync }       from '@/lib/ml/webhook-processor'
import type { MLWebhookPayload }     from '@/lib/ml/webhook-processor'

/**
 * Verifica o header x-signature enviado pelo ML.
 * Formato: "ts=<timestamp>,v1=<hmac-sha256-hex>"
 * Template assinado: "id:<notification._id>;request-id:<x-request-id>;ts:<ts>"
 * Retorna true se válido ou se ML_WEBHOOK_SECRET não estiver configurado (soft mode).
 */
function verifyMLSignature(
  req: NextRequest,
  notificationId: string,
): boolean {
  const secret = process.env.ML_WEBHOOK_SECRET
  if (!secret) {
    // Soft mode: sem secret configurado, apenas logar e continuar
    console.warn('[Webhook] ML_WEBHOOK_SECRET não configurado — validação de assinatura desativada')
    return true
  }

  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id') ?? ''

  if (!xSignature) {
    console.warn('[Webhook] x-signature ausente')
    return false
  }

  // Extrair ts e v1 do header
  const tsMatch = xSignature.match(/ts=([^,]+)/)
  const v1Match = xSignature.match(/v1=([a-f0-9]+)/)

  if (!tsMatch || !v1Match) {
    console.warn('[Webhook] x-signature mal-formatado:', xSignature)
    return false
  }

  const ts       = tsMatch[1]
  const received = v1Match[1]

  // Construir template a ser assinado
  const template = `id:${notificationId};request-id:${xRequestId};ts:${ts}`

  // Calcular HMAC-SHA256
  const expected = createHmac('sha256', secret)
    .update(template)
    .digest('hex')

  const valid = expected === received
  if (!valid) {
    console.warn('[Webhook] Assinatura inválida — possível spoofing. received:', received, 'expected:', expected)
  }
  return valid
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as MLWebhookPayload & Record<string, unknown>

    // Validar payload mínimo — mas sempre retornar 200 para evitar retry do ML
    if (!body.topic || !body.user_id || !body.resource) {
      console.warn('[Webhook] Payload inválido recebido:', body)
      return NextResponse.json({ status: 'received' }, { status: 200 })
    }

    // Validar assinatura x-signature (HMAC-SHA256)
    const notificationId = String(body._id ?? body.id ?? '')
    if (!verifyMLSignature(req, notificationId)) {
      console.error('[Webhook] Assinatura inválida — rejeitando notificação')
      return NextResponse.json({ status: 'received' }, { status: 200 }) // retornar 200 para não reintentar
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
export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, service: 'foguetim-ml-webhook' })
}
