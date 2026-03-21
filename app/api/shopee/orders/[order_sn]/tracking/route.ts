/**
 * GET /api/shopee/orders/[order_sn]/tracking
 * Retorna o número de rastreio de um pedido enviado.
 *
 * Usa: GET /api/v2/logistics/get_tracking_number
 *
 * Query params:
 *   package_number — (opcional) Para pedidos com múltiplos pacotes
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_TRACKING_NUM } from '@/lib/shopee/config'

export async function GET(
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

  const package_number = req.nextUrl.searchParams.get('package_number')

  const extraParams: Record<string, string> = { order_sn }
  if (package_number) extraParams['package_number'] = package_number

  try {
    const data = await shopeeGet(
      SHOPEE_PATH_TRACKING_NUM,
      tokenData.accessToken,
      tokenData.shopId,
      extraParams,
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders/[order_sn]/tracking]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
