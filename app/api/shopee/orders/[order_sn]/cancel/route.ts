/**
 * POST /api/shopee/orders/[order_sn]/cancel
 * Cancela um pedido Shopee.
 *
 * Usa: POST /api/v2/order/cancel_order
 *
 * Body:
 *   cancel_reason — Motivo: OUT_OF_STOCK | CUSTOMER_REQUEST | UNDELIVERABLE_AREA | COD_NOT_SUPPORTED
 *   item_list     — (opcional) Para cancelamento parcial: [{ item_id, model_id }]
 *
 * Restrições: Apenas pedidos UNPAID ou com acordo do comprador podem ser cancelados pelo vendedor.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_ORDER_CANCEL } from '@/lib/shopee/config'

const VALID_REASONS = new Set([
  'OUT_OF_STOCK',
  'CUSTOMER_REQUEST',
  'UNDELIVERABLE_AREA',
  'COD_NOT_SUPPORTED',
])

export async function POST(
  req: NextRequest,
  { params }: { params: { order_sn: string } },
) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tokenData = await getValidShopeeToken(user.id)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  const { order_sn } = params
  if (!order_sn) return NextResponse.json({ error: 'order_sn obrigatório' }, { status: 400 })

  const body = await req.json() as { cancel_reason?: string; item_list?: unknown[] }
  const { cancel_reason, item_list } = body

  if (!cancel_reason || !VALID_REASONS.has(cancel_reason)) {
    return NextResponse.json({
      error: `cancel_reason inválido. Use: ${Array.from(VALID_REASONS).join(' | ')}`,
    }, { status: 400 })
  }

  const payload: Record<string, unknown> = { order_sn, cancel_reason }
  if (Array.isArray(item_list) && item_list.length > 0) {
    payload['item_list'] = item_list
  }

  try {
    const data = await shopeePost(
      SHOPEE_PATH_ORDER_CANCEL,
      tokenData.accessToken,
      tokenData.shopId,
      payload,
    )
    console.log(`[Shopee] cancel_order order_sn=${order_sn} reason=${cancel_reason} user=${user.id}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders/[order_sn]/cancel]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
