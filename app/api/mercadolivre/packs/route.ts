/**
 * GET /api/mercadolivre/packs
 * Lista packs recentes agrupando pedidos por pack_id.
 *
 * Lógica:
 *   1. GET /orders/search?seller={uid}&sort=date_desc&limit=50
 *   2. Agrupa por pack_id
 *   3. Para packs com pack_id real (não null), busca detalhes em paralelo
 *   4. Retorna lista priorizada: packs mais recentes primeiro
 *
 * Query params:
 *   days   (default 30)
 *   limit  (default 50)
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export interface MLPackItem {
  title:     string
  quantity:  number
  unit_price: number
  thumbnail?: string
}

export interface MLPackOrder {
  id:           string | number
  status:       string
  total_amount: number
  items:        MLPackItem[]
}

export interface MLPack {
  pack_id:      string
  status:       string
  date_created: string
  last_updated: string
  buyer: {
    id:       number
    nickname: string
    first_name?: string
    last_name?:  string
  }
  shipment_id:  number | null
  tracking_number?: string
  destination?: string
  orders:       MLPackOrder[]
  total_amount: number
  items_count:  number
}

function mapOrderItems(order: Record<string, unknown>): MLPackItem[] {
  return ((order.order_items as unknown[]) ?? []).map((it: unknown) => {
    const oi   = it as Record<string, unknown>
    const item = (oi.item as Record<string, unknown>) ?? {}
    return {
      title:      String(item.title ?? oi.title ?? ''),
      quantity:   Number(oi.quantity ?? 1),
      unit_price: Number(oi.unit_price ?? 0),
      thumbnail:  (item.picture_url ?? item.thumbnail ?? oi.thumbnail) as string | undefined,
    }
  })
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const sp    = new URL(req.url).searchParams
  const days  = Number(sp.get('days') ?? 30)
  const limit = Math.min(Number(sp.get('limit') ?? 50), 50)
  const auth  = { Authorization: `Bearer ${token}` }
  const mlId  = conn.ml_user_id
  const dateFrom = new Date(Date.now() - days * 86_400_000).toISOString()

  try {
    // 1. Buscar pedidos recentes
    const ordersRes = await fetch(
      `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc&limit=${limit}` +
      `&order.date_created.from=${dateFrom}`,
      { headers: auth },
    )
    if (!ordersRes.ok) {
      const txt = await ordersRes.text()
      return NextResponse.json(
        { connected: true, packs: [], error: `orders (${ordersRes.status}): ${txt}` },
      )
    }

    const ordersData = await ordersRes.json()
    const rawOrders  = (ordersData.results ?? []) as Record<string, unknown>[]

    // 2. Agrupar por pack_id
    const packMap = new Map<string, Record<string, unknown>[]>()
    for (const order of rawOrders) {
      const packId = String(order.pack_id ?? order.id) // fallback: ordem isolada usa seu próprio id
      if (!packMap.has(packId)) packMap.set(packId, [])
      packMap.get(packId)!.push(order)
    }

    // 3. Para pack_ids reais (vindos do ML, não fallback de ordem isolada),
    //    buscar detalhes do pack para obter shipment + buyer authoritative
    const packIds = Array.from(packMap.keys())

    // Identificar quais são pack_ids reais (existem no campo pack_id do pedido)
    const realPackIds = new Set(
      rawOrders
        .filter(o => o.pack_id != null)
        .map(o => String(o.pack_id))
    )

    const packDetailFetches = packIds.map(async packId => {
      if (!realPackIds.has(packId)) return null
      try {
        const r = await fetch(`${ML_API_BASE}/packs/${packId}`, { headers: auth })
        return r.ok ? (await r.json() as Record<string, unknown>) : null
      } catch { return null }
    })

    const packDetails = await Promise.all(packDetailFetches)

    // 4. Montar resposta final
    const packs: MLPack[] = packIds.map((packId, i) => {
      const orders      = packMap.get(packId)!
      const detail      = packDetails[i] as Record<string, unknown> | null
      const firstOrder  = orders[0]
      const buyerRaw    = (detail?.buyer ?? firstOrder.buyer) as Record<string, unknown>
      const shipmentId  = (detail?.shipment_id ?? (firstOrder.shipping as Record<string, unknown>)?.id) as number | null ?? null
      const shipRaw     = (firstOrder.shipping as Record<string, unknown>) ?? {}
      const receiver    = (detail?.receiver_address ?? {}) as Record<string, unknown>
      const city        = ((receiver.city as Record<string, unknown>)?.name as string) ?? ''
      const state       = ((receiver.state as Record<string, unknown>)?.name as string) ?? ''

      const packOrders: MLPackOrder[] = orders.map(o => ({
        id:           o.id as string | number,
        status:       o.status as string,
        total_amount: Number(o.total_amount ?? 0),
        items:        mapOrderItems(o),
      }))

      const total_amount = packOrders.reduce((s, o) => s + o.total_amount, 0)
      const items_count  = packOrders.reduce((s, o) => s + o.items.reduce((si, it) => si + it.quantity, 0), 0)

      return {
        pack_id:      packId,
        status:       String(detail?.status ?? firstOrder.status ?? ''),
        date_created: String(detail?.date_created ?? firstOrder.date_created ?? ''),
        last_updated: String(detail?.last_updated ?? firstOrder.date_closed ?? firstOrder.date_created ?? ''),
        buyer: {
          id:         Number(buyerRaw?.id ?? 0),
          nickname:   String(buyerRaw?.nickname ?? ''),
          first_name: buyerRaw?.first_name as string | undefined,
          last_name:  buyerRaw?.last_name  as string | undefined,
        },
        shipment_id:      shipmentId,
        tracking_number:  (shipRaw.tracking_number as string) ?? undefined,
        destination:      city && state ? `${city} — ${state}` : city || state || undefined,
        orders:           packOrders,
        total_amount,
        items_count,
      }
    })

    return NextResponse.json(
      { connected: true, packs, total: packs.length },
      { headers: { 'Cache-Control': 'private, max-age=60' } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[packs GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
