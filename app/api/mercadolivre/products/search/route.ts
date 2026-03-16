/**
 * GET /api/mercadolivre/products/search
 *
 * Busca server-side de anúncios no ML.
 *
 * Query params:
 *   q        string  — termo de busca (item_id, SKU, ou título)
 *   offset   number  — default 0
 *   limit    number  — default 20, max 200
 *   status   string  — active | paused | closed | under_review | all  (default: active)
 *   type     string  — all | user | catalog  (filtro client-side pós-fetch)
 *
 * Lógica:
 *   1. Se q começa com MLB  → busca direta por item_id
 *   2. Se q sem espaço (≤40 chars) → seller_sku search
 *   3. Se q é texto geral  → paginação normal + filter por título
 *   4. q vazio             → paginação normal
 *
 * Retorna: { items, paging: { total, offset, limit }, search_source }
 */
import { NextRequest, NextResponse }  from 'next/server'
import { getAuthUser }                from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { normalizeSearchTerm }        from '@/lib/ml/listings/normalize-search'

const BATCH = 20   // ML aceita até 20 ids por multiget

const ITEM_FIELDS =
  'id,title,price,original_price,available_quantity,sold_quantity,status,' +
  'permalink,thumbnail,category_id,listing_type_id,condition,date_created,' +
  'last_updated,shipping,catalog_listing,catalog_product_id,seller_custom_field,gtin'

type MLItemRow = Record<string, unknown>

async function multiget(ids: string[], authHeader: string): Promise<MLItemRow[]> {
  const results: MLItemRow[] = []
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH).join(',')
    const res   = await fetch(
      `${ML_API_BASE}/items?ids=${chunk}&attributes=${ITEM_FIELDS}`,
      { headers: { Authorization: authHeader } },
    )
    if (!res.ok) continue
    const batch: { code: number; body: MLItemRow }[] = await res.json()
    for (const entry of batch) {
      if (entry.code === 200 && entry.body) results.push(entry.body)
    }
  }
  return results
}


export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 200 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const raw    = (sp.get('q') ?? '').trim()
  const offset = Math.max(0, Number(sp.get('offset') ?? 0))
  const limit  = Math.min(Math.max(1, Number(sp.get('limit') ?? 20)), 200)
  const status = sp.get('status') ?? 'active'

  const auth = `Bearer ${token}`

  try {
    /* ── 1. Item ID direto (MLB...) ──────────────────────────────────────── */
    if (/^MLB\d+$/i.test(raw)) {
      const items = await multiget([raw.toUpperCase()], auth)
      return NextResponse.json({
        items,
        paging:        { total: items.length, offset: 0, limit },
        search_source: 'item_id',
      })
    }

    /* ── 2. SKU / seller_sku (texto sem espaço, ≤ 40 chars) ─────────────── */
    if (raw && !raw.includes(' ') && raw.length <= 40) {
      const skuUrl = `${ML_API_BASE}/users/${conn.ml_user_id}/items/search` +
        `?seller_sku=${encodeURIComponent(raw)}&limit=50`
      const skuRes = await fetch(skuUrl, { headers: { Authorization: auth } })
      if (skuRes.ok) {
        const skuData: { results?: string[]; paging?: { total: number } } = await skuRes.json()
        const ids = skuData.results ?? []
        if (ids.length > 0) {
          const items = await multiget(ids, auth)
          return NextResponse.json({
            items,
            paging:        { total: skuData.paging?.total ?? items.length, offset: 0, limit: 50 },
            search_source: 'sku',
          })
        }
      }
      // Fall through to title search if SKU search returned nothing
    }

    /* ── 3. Título: paginação normal + filtro by title ───────────────────── */
    const statusParam = status === 'all' ? '' : `&status=${status}`
    const searchUrl   = `${ML_API_BASE}/users/${conn.ml_user_id}/items/search` +
      `?offset=${offset}&limit=${limit}${statusParam}`

    const searchRes = await fetch(searchUrl, { headers: { Authorization: auth } })
    if (!searchRes.ok) {
      const txt = await searchRes.text()
      throw new Error(`ML search (${searchRes.status}): ${txt}`)
    }
    const searchData: { results?: string[]; paging?: { total: number; offset: number; limit: number } } =
      await searchRes.json()

    let ids: string[] = searchData.results ?? []
    const paging      = searchData.paging ?? { total: 0, offset, limit }

    if (ids.length === 0) {
      return NextResponse.json({ items: [], paging, search_source: raw ? 'title' : 'all' })
    }

    const items = await multiget(ids, auth)

    /* Client-side title filter when q is a text term */
    const filtered = raw
      ? (() => {
          const q = normalizeSearchTerm(raw)
          return items.filter((item) => {
            const title = normalizeSearchTerm(String(item.title ?? ''))
            const id    = String(item.id ?? '').toLowerCase()
            const sku   = String((item as Record<string, unknown>).seller_custom_field ?? '').toLowerCase()
            return title.includes(q) || id.includes(q) || sku.includes(q)
          })
        })()
      : items

    return NextResponse.json({
      items:         filtered,
      paging,
      search_source: raw ? 'title' : 'all',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML products/search]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
