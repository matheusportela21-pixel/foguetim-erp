/**
 * GET /api/shopee/orders/[order_sn]/escrow
 * Retorna detalhes financeiros de um pedido concluído (COMPLETED).
 *
 * Usa: GET /api/v2/payment/get_escrow_detail
 *
 * Retorna: comissão Shopee, taxa de serviço, valor líquido do vendedor,
 * vouchers, frete, escrow_amount (valor final que o vendedor recebe).
 *
 * Nota: Disponível apenas para pedidos no status COMPLETED.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_ESCROW_DETAIL } from '@/lib/shopee/config'

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
      SHOPEE_PATH_ESCROW_DETAIL,
      tokenData.accessToken,
      tokenData.shopId,
      { order_sn },
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders/[order_sn]/escrow]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
