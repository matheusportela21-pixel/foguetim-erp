/**
 * GET /api/shopee/products/[item_id]
 * Retorna detalhes completos de um produto Shopee.
 *
 * Usa: GET /api/v2/product/get_item_base_info
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_ITEM_INFO } from '@/lib/shopee/config'

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
      SHOPEE_PATH_ITEM_INFO,
      tokenData.accessToken,
      tokenData.shopId,
      {
        item_id_list: itemId,
        need_tax_info: 'true',
        need_complaint_policy: 'false',
      },
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products/[item_id]]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
