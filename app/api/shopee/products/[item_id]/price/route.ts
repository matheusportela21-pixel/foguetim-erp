/**
 * PATCH /api/shopee/products/[item_id]/price
 * Atualiza o preço de um produto Shopee.
 *
 * Body: { price: number, model_id?: number }
 * Usa: POST /api/v2/product/update_price
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_UPDATE_PRICE } from '@/lib/shopee/config'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { item_id: string } },
) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  const itemId = Number(params.item_id)
  if (isNaN(itemId)) return NextResponse.json({ error: 'item_id inválido' }, { status: 400 })

  const body = await req.json() as { price: number; model_id?: number }
  if (typeof body.price !== 'number' || body.price < 0) {
    return NextResponse.json({ error: 'price inválido' }, { status: 400 })
  }

  try {
    const data = await shopeePost(
      SHOPEE_PATH_UPDATE_PRICE,
      tokenData.accessToken,
      tokenData.shopId,
      {
        item_id: itemId,
        price_list: [
          {
            model_id: body.model_id ?? 0,
            original_price: body.price,
          },
        ],
      },
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products/[item_id]/price]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
