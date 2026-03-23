/**
 * GET /api/mercadolivre/products
 * Lista anúncios do vendedor no ML com multi-get em batches de 20.
 *
 * Query params:
 *   offset   (default 0)
 *   limit    (default 50, max 50)
 *   status   active | paused | closed | under_review | all (default: active)
 *   q        busca por título (client-side)
 *
 * SOMENTE LEITURA — nenhuma escrita na conta ML.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const BATCH = 20   // ML aceita até 20 ids por multiget

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 200 })
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ error: 'Token inválido — reconecte o ML' }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const offset = Number(sp.get('offset') ?? 0)
  const limit  = Math.min(Number(sp.get('limit') ?? 50), 50)
  const status = sp.get('status') ?? 'active'

  const auth = { Authorization: `Bearer ${token}` }

  try {
    // 1. Search item IDs
    const statusParam = status === 'all' ? '' : `&status=${status}`
    const searchUrl = `${ML_API_BASE}/users/${conn.ml_user_id}/items/search?offset=${offset}&limit=${limit}${statusParam}`
    const searchRes = await fetch(searchUrl, { headers: auth })
    if (!searchRes.ok) {
      const txt = await searchRes.text()
      throw new Error(`ML search (${searchRes.status}): ${txt}`)
    }
    const search = await searchRes.json()
    const ids: string[] = search.results ?? []
    const paging = search.paging ?? { total: 0, offset, limit }

    if (ids.length === 0) {
      return NextResponse.json({ items: [], paging })
    }

    // 2. Multi-get in batches of 20
    const items: unknown[] = []
    for (let i = 0; i < ids.length; i += BATCH) {
      const batchIds = ids.slice(i, i + BATCH).join(',')
      const batchRes = await fetch(`${ML_API_BASE}/items?ids=${batchIds}`, { headers: auth })
      if (!batchRes.ok) {
        const txt = await batchRes.text()
        throw new Error(`ML multiget (${batchRes.status}): ${txt}`)
      }
      const batchData: { code: number; body: Record<string, unknown> }[] = await batchRes.json()
      // multiget returns [{ code: 200, body: {...item} }, ...]
      for (const entry of batchData) {
        if (entry.code === 200 && entry.body) {
          const b = entry.body
          items.push({
            id:              b.id,
            title:           b.title,
            price:           b.price,
            original_price:  b.original_price,
            available_quantity: b.available_quantity,
            sold_quantity:   b.sold_quantity,
            status:          b.status,
            permalink:       b.permalink,
            thumbnail:       b.thumbnail,
            category_id:     b.category_id,
            listing_type_id: b.listing_type_id,
            condition:       b.condition,
            date_created:    b.date_created,
            last_updated:    b.last_updated,
            shipping:        b.shipping,
            health:          (b as Record<string, unknown>).health,
          })
        }
      }
    }

    return NextResponse.json({ items, paging })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML products GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
