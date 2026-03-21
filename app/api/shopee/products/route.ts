/**
 * GET /api/shopee/products
 * Lista produtos (anúncios) da loja Shopee conectada.
 *
 * Query params:
 *   offset      — Paginação (padrão: 0)
 *   page_size   — Itens por página (padrão: 20, máx: 100)
 *   item_status — Status do item: NORMAL | BANNED | DELETED | UNLIST (padrão: NORMAL)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_ITEM_LIST } from '@/lib/shopee/config'

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

  const sp = req.nextUrl.searchParams
  const offset      = sp.get('offset')      ?? '0'
  const page_size   = sp.get('page_size')   ?? '20'
  const item_status = sp.get('item_status') ?? 'NORMAL'

  try {
    const data = await shopeeGet(
      SHOPEE_PATH_ITEM_LIST,
      tokenData.accessToken,
      tokenData.shopId,
      { offset, page_size, item_status },
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
