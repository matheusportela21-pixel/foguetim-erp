/**
 * PATCH /api/shopee/products/[item_id]/stock
 * Atualiza o estoque de um produto Shopee.
 *
 * Body: { stock: number, model_id?: number }
 * Usa: POST /api/v2/product/update_stock
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_UPDATE_STOCK } from '@/lib/shopee/config'

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

  const body = await req.json() as { stock: number; model_id?: number }
  if (typeof body.stock !== 'number' || body.stock < 0 || !Number.isInteger(body.stock)) {
    return NextResponse.json({ error: 'stock inválido (deve ser inteiro ≥ 0)' }, { status: 400 })
  }

  try {
    const data = await shopeePost(
      SHOPEE_PATH_UPDATE_STOCK,
      tokenData.accessToken,
      tokenData.shopId,
      {
        item_id: itemId,
        stock_list: [
          {
            model_id: body.model_id ?? 0,
            normal_stock: body.stock,
          },
        ],
      },
    )
    console.log(`[Shopee] update_stock item_id=${itemId} stock=${body.stock} user=${dataOwnerId}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products/[item_id]/stock]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
