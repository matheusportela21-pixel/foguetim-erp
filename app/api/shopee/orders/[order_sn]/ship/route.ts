/**
 * POST /api/shopee/orders/[order_sn]/ship
 * Marca um pedido como enviado (READY_TO_SHIP → PROCESSED).
 *
 * Usa: POST /api/v2/order/ship_order
 *
 * Body (opcional):
 *   tracking_number  — Número de rastreio (para transportadoras non_integrated)
 *   package_number   — Número do pacote (para pedidos divididos)
 *
 * Nota: No sandbox, a maioria dos pedidos não tem janela de expedição real.
 * O endpoint pode retornar erros esperados do sandbox.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_ORDER_SHIP } from '@/lib/shopee/config'

export async function POST(
  req: NextRequest,
  { params }: { params: { order_sn: string } },
) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  const { order_sn } = params
  if (!order_sn) return NextResponse.json({ error: 'order_sn obrigatório' }, { status: 400 })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { /* body vazio é ok */ }

  const { tracking_number, package_number } = body as {
    tracking_number?: string
    package_number?:  string
  }

  // Monta payload para ship_order
  // Se tracking_number foi fornecido, usa non_integrated (transportadora própria)
  const shipPayload: Record<string, unknown> = { order_sn }
  if (package_number)  shipPayload['package_number'] = package_number
  if (tracking_number) {
    shipPayload['non_integrated'] = { tracking_number }
  }

  try {
    const data = await shopeePost(
      SHOPEE_PATH_ORDER_SHIP,
      tokenData.accessToken,
      tokenData.shopId,
      shipPayload,
    )
    console.log(`[Shopee] ship_order order_sn=${order_sn} user=${dataOwnerId}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders/[order_sn]/ship]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
