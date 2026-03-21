/**
 * GET /api/shopee/orders
 * Lista pedidos da loja Shopee conectada.
 *
 * Query params:
 *   days         — Janela de tempo em dias (padrão: 7, máx: 15 para time_range_field=create_time)
 *   order_status — Status: UNPAID | READY_TO_SHIP | PROCESSED | SHIPPED | COMPLETED | IN_CANCEL | CANCELLED
 *   page_size    — Itens por página (padrão: 20, máx: 100)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_ORDER_LIST } from '@/lib/shopee/config'
import { nowTs } from '@/lib/shopee/sign'

export async function GET(req: NextRequest) {
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

  const sp   = req.nextUrl.searchParams
  const days = Math.min(Number(sp.get('days') ?? '7'), 15)
  const page_size    = sp.get('page_size')    ?? '20'
  const order_status = sp.get('order_status') ?? ''

  const now       = nowTs()
  const time_from = now - days * 24 * 60 * 60
  const time_to   = now

  const extraParams: Record<string, string | number> = {
    time_range_field: 'create_time',
    time_from,
    time_to,
    page_size,
  }
  if (order_status) extraParams['order_status'] = order_status

  try {
    const data = await shopeeGet(
      SHOPEE_PATH_ORDER_LIST,
      tokenData.accessToken,
      tokenData.shopId,
      extraParams,
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /orders]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
