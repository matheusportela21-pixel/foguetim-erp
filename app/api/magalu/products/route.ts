/**
 * GET /api/magalu/products
 * Lista SKUs do seller no Magalu (Open API v1).
 *
 * API path: /seller/v1/portfolios/skus
 * Paginação: offset + limit (max 100)
 *
 * A resposta da API pode variar — fazemos parsing robusto:
 * - Array direto: [sku, sku, ...]
 * - Objeto com items/results: { items: [...], meta: { total: N } }
 * - Objeto com data: { data: [...] }
 *
 * Normalizamos para formato consistente no frontend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_SKUS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSku(raw: any) {
  return {
    sku_id:    raw.sku_id ?? raw.id ?? raw.code ?? null,
    title:     raw.title ?? raw.name ?? raw.product_title ?? null,
    status:    raw.status ?? raw.situation ?? null,
    price:     raw.price?.list_price ?? raw.price?.sell_price ?? raw.sale_price ?? raw.price ?? null,
    stock:     raw.stock?.quantity ?? raw.stock?.available ?? raw.stock ?? raw.available_quantity ?? null,
    image_url: raw.images?.[0]?.url ?? raw.image ?? raw.main_image ?? null,
    brand:     raw.brand ?? null,
    category:  raw.category ?? raw.subcategory ?? null,
    _raw:      raw,
  }
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const sp     = new URL(req.url).searchParams
  const offset = sp.get('offset') ?? '0'
  const limit  = sp.get('limit') ?? '50'
  const status = sp.get('status')

  try {
    const params: Record<string, string> = { offset, limit }
    if (status) params.status = status

    const data = await magaluGet(
      MAGALU_PATH_SKUS,
      tokenData.accessToken,
      tokenData.sellerId,
      params,
    )

    // Parse robusta — a API pode retornar em diferentes formatos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any
    let items: unknown[]
    let total: number

    if (Array.isArray(raw)) {
      items = raw
      total = raw.length
    } else if (raw?.items) {
      items = raw.items
      total = raw.meta?.total ?? raw.total ?? items.length
    } else if (raw?.results) {
      items = raw.results
      total = raw.meta?.total ?? raw.total ?? items.length
    } else if (raw?.data) {
      items = Array.isArray(raw.data) ? raw.data : [raw.data]
      total = raw.meta?.total ?? raw.total ?? items.length
    } else {
      // Resposta inesperada — logar e retornar vazio
      console.warn('[Magalu products] Resposta inesperada:', JSON.stringify(raw).substring(0, 300))
      items = []
      total = 0
    }

    const normalized = items.map(normalizeSku)

    return NextResponse.json({
      items: normalized,
      total,
      offset: Number(offset),
      limit:  Number(limit),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Magalu products] ERRO:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
