/**
 * GET /api/mercadolivre/orders
 * Lista pedidos do vendedor com resposta formatada.
 *
 * Query params:
 *   offset          (default 0)
 *   limit           (default 50)
 *   status          paid | shipped | delivered | cancelled | all (default: all)
 *   days            últimos N dias (default: 30)
 *   sort            date_desc | date_asc | total_amount_desc | total_amount_asc (default: date_desc)
 *   shipping_type   filtro de tipo de envio (passthrough)
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('orders:view')
  if (authError) return authError

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 400 })
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ error: 'Token inválido — reconecte o ML' }, { status: 401 })

  const sp            = new URL(req.url).searchParams
  const offset        = Number(sp.get('offset') ?? 0)
  const limit         = Math.min(Number(sp.get('limit') ?? 50), 50)
  const status        = sp.get('status') ?? 'all'
  const days          = Number(sp.get('days') ?? 30)
  const buyerId       = sp.get('buyer_id') ?? null
  const sort          = sp.get('sort') ?? 'date_desc'
  const shippingType  = sp.get('shipping_type') ?? null

  const auth = { Authorization: `Bearer ${token}` }

  try {
    const dateFrom = new Date(Date.now() - days * 86400_000).toISOString()
    const statusParam = status !== 'all' ? `&order.status=${status}` : ''
    const buyerParam  = buyerId ? `&buyer=${buyerId}` : ''
    // ML API only supports date_asc and date_desc for sort
    const mlSort = sort === 'date_asc' ? 'date_asc' : 'date_desc'
    const shippingParam = shippingType ? `&shipping.shipping_type=${shippingType}` : ''
    const url = `${ML_API_BASE}/orders/search?seller=${conn.ml_user_id}&sort=${mlSort}&offset=${offset}&limit=${limit}&order.date_created.from=${dateFrom}${statusParam}${buyerParam}${shippingParam}`

    const res = await fetch(url, { headers: auth })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`ML orders (${res.status}): ${txt}`)
    }
    const data = await res.json()

    const orders = (data.results ?? []).map((o: Record<string, unknown>) => {
      const buyer = (o.buyer as Record<string, unknown>) ?? {}
      const items = ((o.order_items as unknown[]) ?? []).map((i: unknown) => {
        const oi = i as Record<string, unknown>
        const item = (oi.item as Record<string, unknown>) ?? {}
        return {
          title:      item.title,
          quantity:   oi.quantity,
          unit_price: oi.unit_price,
          thumbnail:  item.picture_url ?? (item.thumbnail as string | undefined),
        }
      })
      const payments = ((o.payments as unknown[]) ?? []).map((p: unknown) => {
        const pm = p as Record<string, unknown>
        return { status: pm.status, total_paid_amount: pm.total_paid_amount, payment_method_id: pm.payment_method_id }
      })
      const shipping = (o.shipping as Record<string, unknown>) ?? {}
      return {
        id:           o.id,
        pack_id:      o.pack_id ?? null,
        status:       o.status,
        date_created: o.date_created,
        date_closed:  o.date_closed,
        total_amount: o.total_amount,
        currency_id:  o.currency_id,
        buyer: {
          id:         buyer.id,
          nickname:   buyer.nickname,
          first_name: buyer.first_name,
          last_name:  buyer.last_name,
        },
        order_items: items,
        payments,
        shipping: {
          id:              shipping.id,
          status:          shipping.status,
          tracking_number: (shipping as Record<string, unknown>).tracking_number,
        },
        tags: o.tags,
      }
    })

    return NextResponse.json({ orders, paging: data.paging ?? { total: 0, offset, limit } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML orders GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
