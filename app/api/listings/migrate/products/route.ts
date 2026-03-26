/**
 * GET /api/listings/migrate/products
 * Lista produtos de um canal conectado (paginado) para migração.
 *
 * Query params:
 *   channel  — ml | magalu
 *   offset   — default 0
 *   limit    — default 50
 *   search   — busca opcional por texto
 *   status   — active | inactive | all (default: active)
 *
 * SOMENTE LEITURA — nenhuma ação de escrita.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_SKUS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

interface NormalizedProduct {
  id: string
  title: string
  price: number | null
  thumbnail: string | null
  quantity: number | null
  sku: string | null
  condition: string | null
  status: string | null
  permalink: string | null
}

/* ─── ML: listar produtos ──────────────────────────────────────────────────── */

async function listMLProducts(
  dataOwnerId: string,
  offset: number,
  limit: number,
  search: string | null,
  status: string,
): Promise<{ products: NormalizedProduct[]; paging: { total: number; offset: number; limit: number } }> {
  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    throw new Error('ML não conectado')
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) throw new Error('Token ML inválido — reconecte sua conta')

  const auth = { Authorization: `Bearer ${token}` }

  // Buscar IDs de itens
  let searchUrl = `${ML_API_BASE}/users/${conn.ml_user_id}/items/search?offset=${offset}&limit=${limit}`
  if (status !== 'all') searchUrl += `&status=${status}`
  if (search) searchUrl += `&q=${encodeURIComponent(search)}`

  const searchRes = await fetch(searchUrl, { headers: auth })
  if (!searchRes.ok) {
    const txt = await searchRes.text()
    throw new Error(`ML items/search (${searchRes.status}): ${txt}`)
  }
  const searchData = await searchRes.json()

  const itemIds: string[] = searchData.results ?? []
  if (itemIds.length === 0) {
    return { products: [], paging: { total: searchData.paging?.total ?? 0, offset, limit } }
  }

  // Batch fetch detalhes (max 20 por chamada)
  const products: NormalizedProduct[] = []
  const batchSize = 20

  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batch = itemIds.slice(i, i + batchSize)
    const idsParam = batch.join(',')
    const detailUrl = `${ML_API_BASE}/items?ids=${idsParam}&attributes=id,title,price,thumbnail,available_quantity,status,seller_custom_field,condition,permalink`

    const detailRes = await fetch(detailUrl, { headers: auth })
    if (!detailRes.ok) continue

    const detailData = await detailRes.json()
    for (const entry of detailData) {
      if (entry.code !== 200 || !entry.body) continue
      const item = entry.body
      products.push({
        id:        item.id ?? '',
        title:     item.title ?? '',
        price:     item.price ?? null,
        thumbnail: item.thumbnail ?? null,
        quantity:  item.available_quantity ?? null,
        sku:       item.seller_custom_field ?? null,
        condition: item.condition ?? null,
        status:    item.status ?? null,
        permalink: item.permalink ?? null,
      })
    }
  }

  return {
    products,
    paging: {
      total:  searchData.paging?.total ?? 0,
      offset,
      limit,
    },
  }
}

/* ─── Magalu: listar produtos ──────────────────────────────────────────────── */

async function listMagaluProducts(
  dataOwnerId: string,
  offset: number,
  limit: number,
  status: string,
): Promise<{ products: NormalizedProduct[]; paging: { total: number; offset: number; limit: number } }> {
  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) throw new Error('Magalu não conectado')

  const params: Record<string, string> = { _offset: String(offset), _limit: String(limit) }
  if (status !== 'all') params.status = status

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await magaluGet(MAGALU_PATH_SKUS, tokenData.accessToken, tokenData.sellerId, params) as any

  // Parse robusta — mesma lógica do /api/magalu/products
  let items: unknown[]
  let total: number

  if (Array.isArray(data)) {
    items = data
    total = data.length
  } else if (data?.items) {
    items = data.items
    total = data.meta?.total ?? data.total ?? items.length
  } else if (data?.results) {
    items = data.results
    total = data.meta?.total ?? data.total ?? items.length
  } else if (data?.data) {
    items = Array.isArray(data.data) ? data.data : [data.data]
    total = data.meta?.total ?? data.total ?? items.length
  } else {
    items = []
    total = 0
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products: NormalizedProduct[] = items.map((raw: any) => ({
    id:        String(raw.sku ?? raw.sku_id ?? raw.id ?? raw.code ?? ''),
    title:     raw.title ?? raw.name ?? raw.product_title ?? '',
    price:     raw.price?.list_price ?? raw.price?.sell_price ?? raw.sale_price ?? raw.price ?? null,
    thumbnail: raw.images?.[0]?.url ?? raw.image ?? raw.main_image ?? null,
    quantity:  raw.stock?.quantity ?? raw.stock?.available ?? raw.stock ?? raw.available_quantity ?? null,
    sku:       String(raw.sku ?? raw.sku_id ?? raw.id ?? raw.code ?? ''),
    condition: raw.condition ?? 'new',
    status:    raw.status ?? raw.situation ?? null,
    permalink: null,
  }))

  return { products, paging: { total, offset, limit } }
}

/* ─── Handler GET ──────────────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const sp      = new URL(req.url).searchParams
  const channel = sp.get('channel') ?? ''
  const offset  = Number(sp.get('offset') ?? 0)
  const limit   = Math.min(Number(sp.get('limit') ?? 50), 50)
  const search  = sp.get('search') || null
  const status  = sp.get('status') ?? 'active'

  if (!['ml', 'magalu'].includes(channel)) {
    return NextResponse.json({ error: 'Canal inválido. Use: ml ou magalu' }, { status: 400 })
  }

  try {
    if (channel === 'ml') {
      const result = await listMLProducts(dataOwnerId, offset, limit, search, status)
      return NextResponse.json(result)
    }

    const result = await listMagaluProducts(dataOwnerId, offset, limit, status)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Migrate products GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
