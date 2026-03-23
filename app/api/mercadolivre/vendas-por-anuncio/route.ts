/**
 * GET /api/mercadolivre/vendas-por-anuncio
 * Retorna ranking de anúncios mais vendidos dos últimos N dias.
 *
 * Query params:
 *   days  7 | 30 | 90 (default: 30)
 *
 * Retorna array de AnuncioItem ordenado por total_vendas DESC.
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const ORDERS_LIMIT = 50   // ML max por página
const MAX_PAGES    = 10   // segurança: máximo 500 pedidos
const DELAY_MS     = 200  // delay entre páginas (evitar rate limit)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface ItemAgg {
  item_id:       string
  title:         string
  thumbnail?:    string
  total_vendas:  number
  receita_bruta: number
  taxas_ml:      number
  visitas?:      number
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ connected: false })
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const sp   = new URL(req.url).searchParams
  const days = Math.min(Math.max(Number(sp.get('days') ?? 30), 1), 90)

  const auth     = { Authorization: `Bearer ${token}` }
  const mlId     = conn.ml_user_id
  const dateFrom = new Date(Date.now() - days * 86400_000).toISOString()

  // ── Busca paginada de pedidos ──────────────────────────────────────────────
  const allOrders: Record<string, unknown>[] = []
  let offset          = 0
  let totalFromPaging = Infinity
  let pages           = 0

  while (offset < totalFromPaging && pages < MAX_PAGES) {
    const r = await fetch(
      `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc` +
      `&limit=${ORDERS_LIMIT}&offset=${offset}` +
      `&order.date_created.from=${dateFrom}`,
      { headers: auth }
    )
    if (!r.ok) break

    const d = await r.json()
    totalFromPaging = d.paging?.total ?? 0

    const results: Record<string, unknown>[] = d.results ?? []
    allOrders.push(...results)
    offset += results.length
    pages++

    if (results.length < ORDERS_LIMIT) break  // última página

    // delay entre páginas para não estourar rate limit da ML
    if (pages < MAX_PAGES && offset < totalFromPaging) {
      await sleep(DELAY_MS)
    }
  }

  // ── Agrega por item.id, excluindo pedidos cancelados ──────────────────────
  const map = new Map<string, ItemAgg>()

  for (const order of allOrders) {
    if ((order.status as string) === 'cancelled') continue

    const orderItems = (order.order_items as Record<string, unknown>[]) ?? []

    for (const oi of orderItems) {
      const item   = (oi.item as Record<string, unknown>) ?? {}
      const itemId = String(item.id ?? '').trim()
      if (!itemId) continue

      const title = String(item.title ?? 'Produto sem nome')
      const qty   = Number(oi.quantity   ?? 0)
      const price = Number(oi.unit_price ?? 0)
      const fee   = Number(oi.sale_fee   ?? 0)   // taxa ML por linha de item

      const existing = map.get(itemId)
      if (existing) {
        existing.total_vendas  += qty
        existing.receita_bruta += price * qty
        existing.taxas_ml      += fee
      } else {
        map.set(itemId, {
          item_id:       itemId,
          title,
          total_vendas:  qty,
          receita_bruta: price * qty,
          taxas_ml:      fee,
        })
      }
    }
  }

  // ── Thumbnails via /items?ids=... em lotes de 20 ──────────────────────────
  const itemIds   = Array.from(map.keys())
  const BATCH     = 20

  for (let i = 0; i < itemIds.length; i += BATCH) {
    const batch = itemIds.slice(i, i + BATCH)
    try {
      const tr = await fetch(
        `${ML_API_BASE}/items?ids=${batch.join(',')}`,
        { headers: auth }
      )
      if (tr.ok) {
        const thumbData = await tr.json() as { code: number; body: Record<string, unknown> }[]
        for (const entry of thumbData) {
          if (entry.code === 200 && entry.body?.id) {
            const agg = map.get(String(entry.body.id))
            if (agg) agg.thumbnail = String(entry.body.thumbnail ?? '')
          }
        }
      }
    } catch { /* silently ignore — thumbnail é opcional */ }

    if (i + BATCH < itemIds.length) await sleep(200)
  }

  // ── Calcula métricas finais e ordena ──────────────────────────────────────
  const allItems     = Array.from(map.values())
  const totalVendas  = allItems.reduce((s, x) => s + x.total_vendas, 0)
  const validOrders  = allOrders.filter(o => (o.status as string) !== 'cancelled')

  const sortedItems = allItems.sort((a, b) => b.total_vendas - a.total_vendas)

  // ── Visitas: busca para top 20 itens em paralelo ──────────────────────────
  const top20 = sortedItems.slice(0, 20)
  await Promise.allSettled(
    top20.map(async item => {
      try {
        const vr = await fetch(
          `${ML_API_BASE}/items/${item.item_id}/visits?last=${days}&unit=day`,
          { headers: auth }
        )
        if (vr.ok) {
          const vd = await vr.json() as { total_visits?: number }
          item.visitas = vd.total_visits ?? 0
        }
      } catch { /* optional — não bloqueia */ }
    })
  )

  const items = sortedItems
    .map(x => ({
      item_id:         x.item_id,
      title:           x.title,
      thumbnail:       x.thumbnail,
      total_vendas:    x.total_vendas,
      receita_bruta:   x.receita_bruta,
      taxas_ml:        x.taxas_ml,
      receita_liquida: x.receita_bruta - x.taxas_ml,
      ticket_medio:    x.total_vendas > 0 ? x.receita_bruta / x.total_vendas : 0,
      participacao:    totalVendas > 0 ? (x.total_vendas / totalVendas) * 100 : 0,
      visitas:         x.visitas ?? null,
      conversao:       (x.visitas != null && x.visitas > 0)
                         ? (x.total_vendas / x.visitas) * 100
                         : null,
    }))

  const has_more = pages >= MAX_PAGES && offset < totalFromPaging

  return NextResponse.json(
    {
      connected:    true,
      days,
      totalPedidos: validOrders.length,
      has_more,
      items,
    },
    {
      headers: { 'Cache-Control': 'private, max-age=300' },  // cache 5 min
    }
  )
}
