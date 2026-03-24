/**
 * GET /api/magalu/orders
 * Lista pedidos do seller no Magalu (Open API v1).
 *
 * API path: /seller/v1/orders
 * Paginação: offset + limit
 *
 * Normalizamos a resposta para formato consistente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_ORDERS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOrder(raw: any) {
  // Tentar extrair itens/produtos do pedido
  const rawItems = raw.items ?? raw.products ?? raw.order_items ?? []
  const items = Array.isArray(rawItems) ? rawItems.map((item: Record<string, unknown>) => ({
    title:    item.title ?? item.name ?? item.product_name ?? item.description ?? 'Produto',
    quantity: item.quantity ?? item.qty ?? 1,
    price:    item.price ?? item.unit_price ?? item.sale_price ?? null,
    sku_id:   item.sku_id ?? item.sku ?? item.id ?? null,
  })) : []

  // Calcular total: do campo direto ou somando itens
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalAmount = raw.total_amount ?? raw.total ?? raw.order_total ??
    (items.length > 0
      ? items.reduce((acc: number, i: any) =>
          acc + (Number(i.price ?? 0) * Number(i.quantity ?? 1)), 0 as number)
      : null)

  return {
    order_id:     raw.order_id ?? raw.id ?? raw.code ?? null,
    created_at:   raw.created_at ?? raw.date_created ?? raw.order_date ?? null,
    status:       raw.status ?? raw.order_status ?? null,
    total_amount: totalAmount,
    buyer_name:   raw.buyer?.name ?? raw.customer?.name ?? raw.buyer_name ?? null,
    buyer_email:  raw.buyer?.email ?? raw.customer?.email ?? raw.buyer_email ?? null,
    items,
    _raw:         raw,
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
      MAGALU_PATH_ORDERS,
      tokenData.accessToken,
      tokenData.sellerId,
      params,
    )

    // Parse robusta
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
      console.warn('[Magalu orders] Resposta inesperada:', JSON.stringify(raw).substring(0, 300))
      items = []
      total = 0
    }

    const normalized = items.map(normalizeOrder)

    return NextResponse.json({
      items: normalized,
      total,
      offset: Number(offset),
      limit:  Number(limit),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Magalu orders] ERRO:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
