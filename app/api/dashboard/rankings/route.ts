import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export const dynamic = 'force-dynamic'

interface ProductEntry {
  itemId: string
  title: string
  thumbnail: string | null
  revenue: number
  units: number
  orders: number
  visits?: number
  conversion?: number
}

export async function GET(req: NextRequest) {
  try {
    const { dataOwnerId, error: authError } = await requirePermission('analytics:view')
    if (authError) return authError

    const conn = await getMLConnection(dataOwnerId)
    if (!conn?.connected) {
      return NextResponse.json({ notConnected: true }, { status: 400 })
    }

    const token = await getValidToken(dataOwnerId)
    if (!token) {
      return NextResponse.json({ error: 'Token ML expirado' }, { status: 401 })
    }

    const sp = new URL(req.url).searchParams
    const type = sp.get('type') ?? 'revenue'
    const days = Math.min(Number(sp.get('period') ?? 30), 365)

    // Fetch orders from ML
    const dateFrom = new Date(Date.now() - days * 86_400_000).toISOString()
    const ordersUrl = `${ML_API_BASE}/orders/search?seller=${conn.ml_user_id}&sort=date_desc&offset=0&limit=50&order.date_created.from=${dateFrom}`
    const ordersRes = await fetch(ordersUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!ordersRes.ok) {
      return NextResponse.json(
        { error: 'Falha ao buscar pedidos ML', status: ordersRes.status },
        { status: 502 },
      )
    }

    const ordersData = await ordersRes.json()

    // Aggregate by product (item_id)
    const productMap = new Map<string, ProductEntry>()
    for (const order of ordersData.results ?? []) {
      for (const oi of order.order_items ?? []) {
        const key: string | undefined = oi.item?.id
        if (!key) continue
        const existing = productMap.get(key) || {
          itemId: key,
          title: oi.item.title ?? 'Sem titulo',
          thumbnail: oi.item.picture_url ?? null,
          revenue: 0,
          units: 0,
          orders: 0,
        }
        existing.revenue += (oi.unit_price ?? 0) * (oi.quantity ?? 1)
        existing.units += oi.quantity ?? 1
        existing.orders += 1
        productMap.set(key, existing)
      }
    }

    let rankings = Array.from(productMap.values())

    // Sort by type
    if (type === 'revenue') rankings.sort((a, b) => b.revenue - a.revenue)
    else if (type === 'units') rankings.sort((a, b) => b.units - a.units)

    // For visits/conversion: fetch visits for top 10 items
    if (type === 'visits' || type === 'conversion') {
      const top = rankings.slice(0, 10)
      const visitPromises = top.map(async (item) => {
        try {
          const vRes = await fetch(
            `${ML_API_BASE}/items/${item.itemId}/visits/time_window?last=${days}&unit=day`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          if (vRes.ok) {
            const vData = await vRes.json()
            item.visits =
              vData.total_visits ??
              (vData.results ?? []).reduce(
                (s: number, d: { total?: number }) => s + (d.total ?? 0),
                0,
              )
            item.conversion =
              item.visits && item.visits > 0
                ? Number(((item.units / item.visits) * 100).toFixed(2))
                : 0
          }
        } catch {
          // visits data unavailable for this item
        }
      })
      await Promise.allSettled(visitPromises)

      if (type === 'visits') {
        rankings = top.sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0))
      } else {
        rankings = top.sort((a, b) => (b.conversion ?? 0) - (a.conversion ?? 0))
      }
    }

    return NextResponse.json({
      rankings: rankings.slice(0, 20),
      period: days,
      type,
    })
  } catch (err) {
    console.error('[rankings] Error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
