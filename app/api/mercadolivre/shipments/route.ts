/**
 * GET /api/mercadolivre/shipments
 * Lista envios pendentes de ação do vendedor.
 *
 * Busca pedidos paid → enriquece com dados do shipment.
 * Retorna lista priorizada: ready_to_ship → handling → shipped
 *
 * Query params:
 *   limit  (default 50)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const SHIPMENT_STATUS_ORDER: Record<string, number> = {
  ready_to_ship: 0,
  handling:      1,
  shipped:       2,
  pending:       3,
  delivered:     4,
  not_delivered: 5,
  cancelled:     6,
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const sp    = new URL(req.url).searchParams
  const limit = Math.min(Number(sp.get('limit') ?? 50), 50)
  const auth  = { Authorization: `Bearer ${token}` }
  const mlId  = conn.ml_user_id

  try {
    // 1. Busca pedidos paid (aguardando despacho) + recentes shipped (em trânsito)
    const [paidRes, shippedRes] = await Promise.allSettled([
      fetch(
        `${ML_API_BASE}/orders/search?seller=${mlId}&order.status=paid&sort=date_desc&limit=${limit}`,
        { headers: auth },
      ),
      fetch(
        `${ML_API_BASE}/orders/search?seller=${mlId}&order.status=shipped&sort=date_desc&limit=30`,
        { headers: auth },
      ),
    ])

    const paidOrders: Record<string, unknown>[]    = []
    const shippedOrders: Record<string, unknown>[] = []

    if (paidRes.status === 'fulfilled' && paidRes.value.ok) {
      const d = await paidRes.value.json()
      paidOrders.push(...(d.results ?? []))
    }
    if (shippedRes.status === 'fulfilled' && shippedRes.value.ok) {
      const d = await shippedRes.value.json()
      shippedOrders.push(...(d.results ?? []))
    }

    const allOrders = [...paidOrders, ...shippedOrders]

    // 2. Para cada pedido com shipment_id, buscar detalhes do envio em paralelo
    const ordersWithShipment = allOrders.filter(o => {
      const shipping = o.shipping as Record<string, unknown> | undefined
      return shipping?.id
    })

    const shipmentFetches = ordersWithShipment.map(order => {
      const shipping = order.shipping as Record<string, unknown>
      const shipId   = shipping.id
      return fetch(
        `${ML_API_BASE}/shipments/${shipId}`,
        { headers: { ...auth, 'x-format-new': 'true' } },
      )
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    })

    const shipmentResults = await Promise.all(shipmentFetches)

    // 3. Unificar orders + shipment data
    const items = ordersWithShipment.map((order, i) => {
      const shipment = shipmentResults[i] as Record<string, unknown> | null
      const buyer    = (order.buyer as Record<string, unknown>) ?? {}
      const items    = ((order.order_items as unknown[]) ?? []).map((it: unknown) => {
        const oi   = it as Record<string, unknown>
        const item = (oi.item as Record<string, unknown>) ?? {}
        return {
          title:      item.title,
          quantity:   oi.quantity,
          unit_price: oi.unit_price,
          thumbnail:  item.picture_url ?? item.thumbnail,
        }
      })

      const receiver = (shipment?.receiver_address as Record<string, unknown>) ?? {}
      const city     = (receiver.city as Record<string, unknown>)?.name ?? ''
      const state    = (receiver.state as Record<string, unknown>)?.name ?? ''

      return {
        order_id:     order.id,
        order_status: order.status,
        date_created: order.date_created,
        total_amount: order.total_amount,
        buyer: {
          nickname:   buyer.nickname,
          first_name: buyer.first_name,
          last_name:  buyer.last_name,
        },
        order_items: items,
        shipment: shipment ? {
          id:              shipment.id,
          status:          shipment.status,
          substatus:       shipment.substatus,
          tracking_number: shipment.tracking_number,
          date_created:    shipment.date_created,
          last_updated:    shipment.last_updated,
          service_id:      shipment.service_id,
          logistic_type:   shipment.logistic_type,
          destination:     city && state ? `${city} — ${state}` : city || state || '',
        } : null,
      }
    })

    // 4. Ordenar por prioridade de status
    items.sort((a, b) => {
      const pa = SHIPMENT_STATUS_ORDER[String(a.shipment?.status ?? 'cancelled')] ?? 9
      const pb = SHIPMENT_STATUS_ORDER[String(b.shipment?.status ?? 'cancelled')] ?? 9
      return pa - pb
    })

    return NextResponse.json(
      { connected: true, items, total: items.length },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[shipments GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
