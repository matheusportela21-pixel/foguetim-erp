/**
 * GET /api/mercadolivre/products/search
 *
 * Query params:
 *   q          string  — termo de busca
 *   offset     number  — default 0
 *   limit      number  — default 50, max 200
 *   status     string  — active | paused | closed | under_review | all  (default: active)
 *   catalog_tab string — all | user | catalog  (default: all)
 *   sort       string  — updated_desc | price_asc | etc.
 *
 * Lógica:
 *   1. Se tabela local ml_listings tem dados → busca no Supabase (rápido, global)
 *   2. Se não tem dados locais → busca direto na API ML (mais lento, apenas página atual)
 *
 * Retorna: { items, paging: { total, offset, limit }, search_source, has_local_data }
 */
import { NextRequest, NextResponse }      from 'next/server'
import { getAuthUser }                    from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { supabaseAdmin }                  from '@/lib/supabase-admin'
import { normalizeSearchTerm }            from '@/lib/ml/listings/normalize-search'
import { getLocalListingCount }           from '@/lib/ml/listings/ml-listings-sync.service'
import { searchLocalListings }            from '@/lib/ml/listings/ml-listings-search.service'
import type { ListingsSearchQuery }       from '@/lib/ml/listings/ml-listings-search.service'

const BATCH = 20

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

  const sp          = new URL(req.url).searchParams
  const raw         = (sp.get('q') ?? '').trim()
  const limit       = Math.min(Math.max(1, Number(sp.get('per_page') ?? sp.get('limit') ?? 50)), 200) as ListingsSearchQuery['per_page']
  const page        = sp.get('page') ? Math.max(1, Number(sp.get('page'))) : undefined
  const offset      = page ? (page - 1) * limit : Math.max(0, Number(sp.get('offset') ?? 0))
  const resolvedPage = page ?? Math.floor(offset / limit) + 1
  const status      = sp.get('status') ?? 'active'
  const catalog_tab = (sp.get('catalog_tab') ?? 'all') as ListingsSearchQuery['catalog_tab']
  const sort        = (sp.get('sort') ?? 'updated_desc') as ListingsSearchQuery['sort']

  const auth    = `Bearer ${token}`
  const supabase = supabaseAdmin()

  try {
    /* ── Local DB path ────────────────────────────────────────────────────── */
    const localCount = await getLocalListingCount(user.id, supabase)

    if (localCount > 0) {
      const result = await searchLocalListings(
        user.id,
        {
          q:           raw,
          status:      status === 'all' ? undefined : status,
          catalog_tab,
          page:        resolvedPage,
          per_page:    limit,
          sort,
        },
        supabase,
      )

      // Map ListingRowViewModel → MLItem shape expected by the frontend
      const items = result.items.map((r) => ({
        id:                   r.item_id,
        title:                r.title,
        price:                r.price,
        original_price:       null,
        available_quantity:   r.stock,
        sold_quantity:        r.sold_quantity,
        status:               r.status,
        permalink:            `https://www.mercadolivre.com.br/anuncio/${r.item_id}`,
        thumbnail:            r.thumbnail ?? '',
        listing_type_id:      r.listing_type,
        condition:            '',
        date_created:         r.synced_at,
        last_updated:         r.synced_at,
        catalog_listing:      r.catalog_listing,
        catalog_product_id:   null,
        seller_custom_field:  r.seller_sku ?? null,
        gtin:                 r.ean ? [r.ean] : null,
        shipping:             {},
      }))

      const { pagination } = result

      return NextResponse.json({
        items,
        paging: {
          total:  pagination.total,
          offset: pagination.from - 1,
          limit,
        },
        pagination,
        search_source:  result.search_info.matched_by ?? 'all',
        has_local_data: true,
      })
    }

    /* ── ML API path ──────────────────────────────────────────────────────── */

    // 1. Item ID direto (MLB...)
    if (/^MLB\d+$/i.test(raw)) {
      const items = await multiget([raw.toUpperCase()], auth)
      const total = items.length
      return NextResponse.json({
        items,
        paging:      { total, offset: 0, limit },
        pagination:  { total, page: 1, per_page: limit, total_pages: 1, from: 1, to: total },
        search_info: { query: raw, matched_by: 'item_id', source: 'ml_api' },
        has_local_data: false,
      })
    }

    // 2. SKU / seller_sku
    if (raw && !raw.includes(' ') && raw.length <= 40) {
      const skuUrl = `${ML_API_BASE}/users/${conn.ml_user_id}/items/search` +
        `?seller_sku=${encodeURIComponent(raw)}&limit=50`
      const skuRes = await fetch(skuUrl, { headers: { Authorization: auth } })
      if (skuRes.ok) {
        const skuData: { results?: string[]; paging?: { total: number } } = await skuRes.json()
        const ids = skuData.results ?? []
        if (ids.length > 0) {
          const items = await multiget(ids, auth)
          const total = skuData.paging?.total ?? items.length
          return NextResponse.json({
            items,
            paging:      { total, offset: 0, limit },
            pagination:  { total, page: 1, per_page: limit, total_pages: Math.ceil(total / limit), from: 1, to: items.length },
            search_info: { query: raw, matched_by: 'sku', source: 'ml_api' },
            has_local_data: false,
          })
        }
      }
    }

    // 3. Paginação normal (sem filtro de título — ML API não suporta)
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

    const ids    = searchData.results ?? []
    const mlPaging = searchData.paging ?? { total: 0, offset, limit }

    if (ids.length === 0) {
      return NextResponse.json({
        items:       [],
        paging:      mlPaging,
        pagination:  { total: mlPaging.total, page: resolvedPage, per_page: limit, total_pages: Math.ceil(mlPaging.total / limit), from: 0, to: 0 },
        search_info: { query: raw, matched_by: null, source: 'ml_api' },
        has_local_data: false,
      })
    }

    const allItems = await multiget(ids, auth)
    const total    = mlPaging.total

    return NextResponse.json({
      items:       allItems,
      paging:      mlPaging,
      pagination:  { total, page: resolvedPage, per_page: limit, total_pages: Math.ceil(total / limit), from: offset + 1, to: Math.min(offset + limit, total) },
      search_info: { query: raw, matched_by: raw ? 'title' : null, source: 'ml_api' },
      has_local_data: false,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML products/search]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
