/**
 * GET /api/shopee/products/[item_id]/models
 * Retorna variações (modelos) de um produto Shopee.
 *
 * Usa: GET /api/v2/product/get_model_list
 * Retorna tier_variation (opções como Cor, Tamanho) e model[] (combinações com preço/estoque).
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_GET_MODELS } from '@/lib/shopee/config'

export async function GET(
  req: NextRequest,
  { params }: { params: { item_id: string } },
) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
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
