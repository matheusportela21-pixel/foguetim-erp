/**
 * PATCH /api/shopee/products/[item_id]/status
 * Ativa ou desativa (unlista) um produto Shopee.
 *
 * Body: { unlist: boolean }
 *   unlist: true  → remove da listagem (UNLIST)
 *   unlist: false → reativa na listagem (NORMAL)
 *
 * Usa: POST /api/v2/product/unlist_item
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_UNLIST_ITEM } from '@/lib/shopee/config'

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

  const body = await req.json() as { unlist: boolean }
  if (typeof body.unlist !== 'boolean') {
    return NextResponse.json({ error: 'campo "unlist" (boolean) obrigatório' }, { status: 400 })
  }

  try {
    const data = await shopeePost(
      SHOPEE_PATH_UNLIST_ITEM,
      tokenData.accessToken,
      tokenData.shopId,
      {
        item_list: [
          { item_id: itemId, unlist: body.unlist },
        ],
      },
    )
    const action = body.unlist ? 'deslistado' : 'ativado'
    console.log(`[Shopee] unlist_item item_id=${itemId} ${action} user=${dataOwnerId}`)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products/[item_id]/status]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
