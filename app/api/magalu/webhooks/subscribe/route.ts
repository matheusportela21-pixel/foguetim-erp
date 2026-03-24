/**
 * POST /api/magalu/webhooks/subscribe
 * Registra ou atualiza a URL de webhook no Magalu via API.
 * Usa /seller/v1/webhooks (se disponível) ou retorna instruções manuais.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluPost } from '@/lib/magalu/client'

export const dynamic = 'force-dynamic'

const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/magalu`
  : 'https://app.foguetim.com.br/api/webhooks/magalu'

const DEFAULT_EVENTS = [
  'order.created',
  'order.updated',
  'order.status_changed',
  'ticket.created',
  'ticket.updated',
  'product.stock_low',
  'product.stock_zero',
  'conversation.message',
]

export async function POST(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as { events?: string[] }
  const events = body.events ?? DEFAULT_EVENTS

  try {
    const result = await magaluPost(
      '/seller/v1/webhooks',
      {
        url:    WEBHOOK_URL,
        events: events,
        active: true,
      },
      tokenData.accessToken,
      tokenData.sellerId,
    )

    return NextResponse.json({
      ok: true,
      webhook_url: WEBHOOK_URL,
      events,
      data: result,
    })
  } catch (err) {
    console.warn('[Magalu Webhooks] subscribe error:', err)
    // Retornar instruções manuais caso a API não suporte
    return NextResponse.json({
      ok: false,
      manual: true,
      webhook_url: WEBHOOK_URL,
      events,
      message: 'Configure manualmente no Dev Center Magalu: https://developers.magalu.com',
      instruction: `Acesse Dev Center → Webhooks → Adicionar URL: ${WEBHOOK_URL}`,
    })
  }
}
