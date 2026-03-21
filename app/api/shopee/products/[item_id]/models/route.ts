/**
 * GET /api/shopee/products/[item_id]/models
 * Retorna variações (modelos) de um produto Shopee.
 *
 * Usa: GET /api/v2/product/get_model_list
 * Retorna tier_variation (opções como Cor, Tamanho) e model[] (combinações com preço/estoque).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_GET_MODELS } from '@/lib/shopee/config'

export async function GET(
  req: NextRequest,
  { params }: { params: { item_id: string } },
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

  const itemId = params.item_id
  if (!itemId || isNaN(Number(itemId))) {
    return NextResponse.json({ error: 'item_id inválido' }, { status: 400 })
  }

  try {
    const data = await shopeeGet(
      SHOPEE_PATH_GET_MODELS,
      tokenData.accessToken,
      tokenData.shopId,
      { item_id: itemId },
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products/[item_id]/models]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
