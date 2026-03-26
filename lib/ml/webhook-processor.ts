/**
 * Processador assíncrono de webhooks do Mercado Livre.
 * Chamado em background após o endpoint retornar 200 para o ML.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getValidToken } from '@/lib/mercadolivre'
import { sendEmail } from '@/lib/email/email.service'
import { newOrderTemplate }    from '@/lib/email/templates/new-order'
import { newClaimTemplate }    from '@/lib/email/templates/new-claim'
import { newQuestionTemplate } from '@/lib/email/templates/new-question'

export interface MLWebhookPayload {
  _id?:            string
  topic:           string
  resource:        string
  user_id:         number
  application_id?: number
  sent?:           string
  attempts?:       number
}

/* ── Email helper ─────────────────────────────────────────────────────────── */

async function sendEmailIfEnabled(
  userId:    string,
  prefKey:   string,
  emailData: { subject: string; html: string },
): Promise<void> {
  const db = supabaseAdmin()
  const { data: user } = await db
    .from('users')
    .select('email, email_prefs')
    .eq('id', userId)
    .single()

  if (!user?.email) return

  const prefs = (user.email_prefs ?? {}) as Record<string, boolean>
  if (!prefs[prefKey]) return // opt-in: desativado por padrão

  await sendEmail({ to: user.email, ...emailData })
}

/* ── Entry point ──────────────────────────────────────────────────────────── */

export async function processWebhookAsync(payload: MLWebhookPayload): Promise<void> {
  const db = supabaseAdmin()

  // Resolver ml_user_id (coluna direta) → foguetim user_id via marketplace_connections
  const { data: connection } = await db
    .from('marketplace_connections')
    .select('user_id')
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .eq('ml_user_id', payload.user_id)
    .maybeSingle()

  if (!connection) {
    console.warn('[Webhook] Usuário ML não encontrado:', payload.user_id)
    return
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
      break
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

  // Tentar buscar dados do pedido para o email
  try {
    const token = await getValidToken(userId)
    if (token) {
      const r = await fetch(
        `https://api.mercadolibre.com/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (r.ok) {
        const order = await r.json() as Record<string, unknown>
        const buyer    = (order.buyer as Record<string, unknown>) ?? {}
        const items    = (order.order_items as Record<string, unknown>[]) ?? []
        const firstItem = (items[0]?.item as Record<string, unknown>) ?? {}
        const shipping  = (order.shipping as Record<string, unknown>) ?? {}
        const receiver  = (shipping.receiver_address as Record<string, unknown>) ?? {}
        const city      = ((receiver.city as Record<string, unknown>)?.name as string) ?? ''
        const state     = ((receiver.state as Record<string, unknown>)?.name as string) ?? ''
        const { data: sellerUser } = await db.from('users').select('name').eq('id', userId).single()

        await sendEmailIfEnabled(userId, 'new_order', newOrderTemplate({
          sellerName:   (sellerUser?.name as string) || 'vendedor',
          orderId,
          productTitle: (firstItem.title as string) || 'Produto',
          quantity:     (items[0]?.quantity as number) || 1,
          price:        (order.total_amount as number) || 0,
          buyerName:    `${buyer.first_name ?? ''} ${buyer.last_name ?? ''}`.trim() || (buyer.nickname as string) || '—',
          city,
          state,
        }))
      }
    }
  } catch {
    // Falha no email não deve quebrar o webhook
  }

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

  // Tentar buscar dados da pergunta para o email
  try {
    const token = await getValidToken(userId)
    if (token && questionId) {
      const r = await fetch(
        `https://api.mercadolibre.com/questions/${questionId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (r.ok) {
        const q    = await r.json() as Record<string, unknown>
        const item = (q.item_id as string) || ''
        let itemTitle = item
        if (item) {
          const ir = await fetch(`https://api.mercadolibre.com/items/${item}?attributes=title`, { headers: { Authorization: `Bearer ${token}` } })
          if (ir.ok) { const id = await ir.json() as Record<string, unknown>; itemTitle = (id.title as string) || item }
        }
        const { data: sellerUser } = await supabaseAdmin().from('users').select('name').eq('id', userId).single()
        await sendEmailIfEnabled(userId, 'new_question', newQuestionTemplate({
          sellerName:   (sellerUser?.name as string) || 'vendedor',
          questionId:   questionId,
          questionText: (q.text as string) || '',
          itemTitle,
        }))
      }
    }
  } catch {
    // Falha no email não deve quebrar o webhook
  }

}

async function handleClaimWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db      = supabaseAdmin()
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

  // Tentar buscar dados da reclamação para o email
  try {
    const token = await getValidToken(userId)
    if (token && claimId) {
      const r = await fetch(
        `https://api.mercadolibre.com/claims/${claimId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (r.ok) {
        const claim = await r.json() as Record<string, unknown>
        const reason   = (claim.reason_id as string) || 'Motivo não informado'
        const { data: sellerUser } = await db.from('users').select('name').eq('id', userId).single()
        await sendEmailIfEnabled(userId, 'new_claim', newClaimTemplate({
          sellerName:        (sellerUser?.name as string) || 'vendedor',
          claimId,
          productTitle:      'Produto da reclamação',
          reason,
          deadline:          '48 horas',
          affectsReputation: true,
        }))
      }
    }
  } catch {
    // Falha no email não deve quebrar o webhook
  }

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

}

async function handleShipmentWebhook(payload: MLWebhookPayload, userId: string): Promise<void> {
  const db         = supabaseAdmin()
  const shipmentId = payload.resource.split('/').pop()
  if (!shipmentId) return

  // Tentar buscar status atual do envio via ML API
  let statusLabel  = 'atualizado'
  let notifType: 'info' | 'warning' | 'success' = 'info'

  try {
    const token = await getValidToken(userId)
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

}
