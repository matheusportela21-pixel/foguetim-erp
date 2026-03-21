/**
 * GET /api/shopee/orders/[order_sn]
 * Retorna detalhe completo de um pedido Shopee.
 *
 * Usa: GET /api/v2/order/get_order_detail
 * Inclui: itens, comprador, endereço, pagamento, envio, pacotes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_ORDER_DETAIL, SHOPEE_ORDER_OPTIONAL_FIELDS } from '@/lib/shopee/config'

export async function GET(
  _req: NextRequest,
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

  try {
    const data = await shopeeGet(
      SHOPEE_PATH_ORDER_DETAIL,
      tokenData.accessToken,
      tokenData.shopId,
      {
        order_sn_list:            order_sn,
        response_optional_fields: SHOPEE_ORDER_OPTIONAL_FIELDS,
      },
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders/[order_sn]]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
