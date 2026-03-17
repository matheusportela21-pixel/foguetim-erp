/**
 * Processador assíncrono de webhooks do Mercado Livre.
 * Chamado em background após o endpoint retornar 200 para o ML.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface MLWebhookPayload {
  _id?:            string
  topic:           string
  resource:        string
  user_id:         number
  application_id?: number
  sent?:           string
  attempts?:       number
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

export async function processWebhookAsync(payload: MLWebhookPayload): Promise<void> {
  const db = supabaseAdmin()

  // Resolver ml_user_id → foguetim user_id via marketplace_connections
  const { data: connection } = await db
    .from('marketplace_connections')
    .select('user_id')
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .filter('data->>ml_user_id', 'eq', String(payload.user_id))
    .maybeSingle()

  if (!connection) {
    // Tentar pelo campo ml_seller_id como fallback
    const { data: fallback } = await db
      .from('marketplace_connections')
      .select('user_id')
      .eq('marketplace', 'mercadolivre')
      .eq('connected', true)
      .filter('data->>ml_seller_id', 'eq', String(payload.user_id))
      .maybeSingle()

    if (!fallback) {
      console.warn('[Webhook] Usuário ML não encontrado:', payload.user_id)
      return
    }

    return dispatchTopic(payload, fallback.user_id)
  }

  return dispatchTopic(payload, connection.user_id)
}

async function dispatchTopic(payload: MLWebhookPayload, foguetimUserId: string): Promise<void> {
  switch (payload.topic) {
    case 'orders_v2':
      await handleOrderWebhook(payload, foguetimUserId)
      break
    case 'questions':
      await handleQuestionWebhook(payload, foguetimUserId)
      break
    case 'claims':
      await handleClaimWebhook(payload, foguetimUserId)
      break
    case 'messages':
      await handleMessageWebhook(payload, foguetimUserId)
      break
    case 'shipments':
      await handleShipmentWebhook(payload, foguetimUserId)
      break
    case 'items':
      await handleItemWebhook(payload, foguetimUserId)
      break
    case 'payments':
      await handlePaymentWebhook(payload, foguetimUserId)
      break
    default:
      console.log('[Webhook] Tópico não tratado:', payload.topic)
  }
}

/* ── Handlers por tópico ──────────────────────────────────────────────────── */

async function handleOrderWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db      = supabaseAdmin()
  const orderId = payload.resource.split('/').pop()
  if (!orderId) return

  await Promise.all([
    db.from('notifications').insert({
      user_id:    userId,
      title:      'Novo pedido recebido',
      message:    `Pedido #${orderId} chegou no Mercado Livre`,
      type:       'info',
      category:   'orders',
      action_url: '/dashboard/pedidos',
      read:       false,
    }),
    db.from('activity_logs').insert({
      user_id:     userId,
      action:      'webhook_order',
      category:    'orders',
      description: `Webhook recebido: pedido ${orderId}`,
      metadata:    { order_id: orderId, topic: payload.topic },
      visibility:  'user',
    }),
  ])

  console.log('[Webhook] Pedido processado:', orderId)
}

async function handleQuestionWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db         = supabaseAdmin()
  const questionId = payload.resource.split('/').pop()

  await db.from('notifications').insert({
    user_id:    userId,
    title:      'Nova pergunta recebida',
    message:    'Você tem uma nova pergunta no Mercado Livre',
    type:       'info',
    category:   'sac',
    action_url: '/dashboard/sac',
    read:       false,
  })

  console.log('[Webhook] Pergunta processada:', questionId)
}

async function handleClaimWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db     = supabaseAdmin()
  const claimId = payload.resource.split('/').pop()

  await db.from('notifications').insert({
    user_id:    userId,
    title:      'Reclamação aberta',
    message:    'Uma reclamação foi aberta. Responda em até 48h para proteger sua reputação.',
    type:       'warning',
    category:   'claims',
    action_url: '/dashboard/reclamacoes',
    read:       false,
  })

  console.log('[Webhook] Reclamação processada:', claimId)
}

async function handleMessageWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db = supabaseAdmin()

  await db.from('notifications').insert({
    user_id:    userId,
    title:      'Nova mensagem',
    message:    'Você recebeu uma mensagem no Mercado Livre',
    type:       'info',
    category:   'messages',
    action_url: '/dashboard/sac',
    read:       false,
  })

  console.log('[Webhook] Mensagem processada:', payload.resource)
}

async function handleShipmentWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db         = supabaseAdmin()
  const shipmentId = payload.resource.split('/').pop()
  if (!shipmentId) return

  // Tentar buscar status atual do envio via ML API
  let statusLabel  = 'atualizado'
  let notifType: 'info' | 'warning' | 'success' = 'info'

  try {
    const { data: conn } = await db
      .from('marketplace_connections')
      .select('data')
      .eq('user_id', userId)
      .eq('marketplace', 'mercadolivre')
      .maybeSingle()

    const token = (conn?.data as Record<string, unknown>)?.access_token as string | undefined
    if (token) {
      const r = await fetch(
        `https://api.mercadolibre.com/shipments/${shipmentId}`,
        { headers: { Authorization: `Bearer ${token}`, 'x-format-new': 'true' } },
      )
      if (r.ok) {
        const shipment = await r.json() as Record<string, unknown>
        const status = String(shipment.status ?? '')
        const STATUS_LABELS: Record<string, string> = {
          pending:       'Aguardando pagamento',
          handling:      'Aguardando despacho',
          ready_to_ship: 'Pronto para enviar',
          shipped:       'Em trânsito',
          delivered:     'Entregue',
          not_delivered: 'Não entregue',
          cancelled:     'Cancelado',
        }
        statusLabel = STATUS_LABELS[status] ?? status
        if (status === 'delivered')     notifType = 'success'
        if (status === 'not_delivered') notifType = 'warning'
        if (status === 'ready_to_ship') notifType = 'info'
      }
    }
  } catch {
    // Se falhar, prosseguir com label genérico
  }

  await Promise.all([
    db.from('notifications').insert({
      user_id:    userId,
      title:      'Envio atualizado',
      message:    `Envio #${shipmentId}: ${statusLabel}`,
      type:       notifType,
      category:   'orders',
      action_url: '/dashboard/expedicao',
      read:       false,
    }),
    db.from('activity_logs').insert({
      user_id:     userId,
      action:      'webhook_shipment',
      category:    'orders',
      description: `Envio ${shipmentId}: ${statusLabel}`,
      metadata:    { shipment_id: shipmentId },
      visibility:  'user',
    }),
  ])

  console.log('[Webhook] Envio processado:', shipmentId, statusLabel)
}

async function handleItemWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db    = supabaseAdmin()
  const itemId = payload.resource.split('/').pop()

  await db.from('activity_logs').insert({
    user_id:     userId,
    action:      'webhook_item',
    category:    'products',
    description: `Anúncio modificado pelo ML: ${itemId}`,
    metadata:    { item_id: itemId },
    visibility:  'user',
  })

  console.log('[Webhook] Item processado:', itemId)
}

async function handlePaymentWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db       = supabaseAdmin()
  const paymentId = payload.resource.split('/').pop()

  await db.from('notifications').insert({
    user_id:    userId,
    title:      'Pagamento confirmado',
    message:    `Pagamento #${paymentId} processado no Mercado Livre`,
    type:       'success',
    category:   'orders',
    action_url: '/dashboard/financeiro',
    read:       false,
  })

  console.log('[Webhook] Pagamento processado:', paymentId)
}
