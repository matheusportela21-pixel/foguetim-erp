/**
 * POST /api/webhooks/magalu
 * Recebe notificações da API Magalu e responde 200 imediatamente.
 *
 * GET — retorna 200 para validação da URL no Dev Center Magalu.
 *
 * Segurança: valida x-magalu-signature (HMAC-SHA256) quando
 * MAGALU_WEBHOOK_SECRET estiver configurado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface MagaluWebhookPayload {
  event_type?:  string
  event?:       string
  type?:        string
  resource?:    string
  resource_id?: string
  seller_id?:   string
  data?:        Record<string, unknown>
  timestamp?:   string
  [key: string]: unknown
}

/** Verifica assinatura Magalu via HMAC-SHA256 */
function verifyMagaluSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MAGALU_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Webhook Magalu] MAGALU_WEBHOOK_SECRET não configurado — validação desativada')
    return true
  }

  const signature = req.headers.get('x-magalu-signature') ?? req.headers.get('x-hub-signature-256')
  if (!signature) {
    console.warn('[Webhook Magalu] Assinatura ausente nos headers')
    return false
  }

  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  const valid = expected === signature

  if (!valid) {
    console.warn('[Webhook Magalu] Assinatura inválida — possível spoofing')
  }
  return valid
}

/** Persiste evento na fila de webhooks para auditoria */
async function persistWebhookEvent(payload: MagaluWebhookPayload): Promise<void> {
  try {
    const eventType = payload.event_type ?? payload.event ?? payload.type ?? 'magalu.unknown'
    await supabaseAdmin()
      .from('webhook_queue')
      .insert({
        topic:          eventType,
        resource:       payload.resource ?? payload.resource_id ?? JSON.stringify(payload.data ?? {}),
        user_id:        payload.seller_id ?? null,
        application_id: null,
        payload:        payload,
        status:         'pending',
        received_at:    new Date().toISOString(),
      })
  } catch (err) {
    console.error('[Webhook Magalu] Erro ao persistir evento:', err)
  }
}

/** Processa eventos relevantes do Magalu */
async function processMagaluEvent(payload: MagaluWebhookPayload): Promise<void> {
  const eventType = payload.event_type ?? payload.event ?? payload.type ?? ''

  switch (eventType) {
    case 'order.created':
    case 'order.updated':
    case 'order.status_changed':
    case 'order_created':
    case 'order_updated':
      break

    case 'ticket.created':
    case 'ticket.updated':
      break

    case 'conversation.message':
    case 'chat.message':
      break

    case 'product.stock_low':
    case 'product.stock_zero':
    case 'product_updated':
      break

    default:
      break
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Validar assinatura antes de parsear
    if (!verifyMagaluSignature(req, rawBody)) {
      console.error('[Webhook Magalu] Assinatura inválida — ignorando')
      // Retornar 200 para evitar retries em loop
      return NextResponse.json({ status: 'received' }, { status: 200 })
    }

    let payload: MagaluWebhookPayload
    try {
      payload = JSON.parse(rawBody) as MagaluWebhookPayload
    } catch {
      console.warn('[Webhook Magalu] Payload não é JSON válido')
      return NextResponse.json({ status: 'received' }, { status: 200 })
    }

    // Persistir e processar assincronamente (não bloqueia resposta)
    void persistWebhookEvent(payload)
    void processMagaluEvent(payload)

    // Responder 200 imediatamente
    return NextResponse.json({ status: 'received' }, { status: 200 })

  } catch (error) {
    console.error('[Webhook Magalu] Erro no handler:', error)
    return NextResponse.json({ status: 'received' }, { status: 200 })
  }
}

export async function GET(_req: NextRequest) {
  return NextResponse.json({ ok: true, service: 'foguetim-magalu-webhook' })
}
