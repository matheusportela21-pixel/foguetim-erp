/**
 * PATCH /api/shopee/products/[item_id]/info
 * Atualiza nome e/ou descrição de um produto Shopee.
 *
 * Body: { item_name?: string, description?: string }
 * Usa: POST /api/v2/product/update_item
 *
 * Nota: Na sandbox Shopee, update_item pode retornar erros dependendo
 * da categoria do produto. A resposta é tratada com tolerância.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeePost } from '@/lib/shopee/client'
import { SHOPEE_PATH_UPDATE_ITEM } from '@/lib/shopee/config'

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

  const body = await req.json() as { item_name?: string; description?: string }
  if (!body.item_name && !body.description) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const payload: Record<string, unknown> = { item_id: itemId }
  if (body.item_name)   payload.name        = body.item_name
  if (body.description) payload.description = body.description

  try {
    const data = await shopeePost(
      SHOPEE_PATH_UPDATE_ITEM,
      tokenData.accessToken,
      tokenData.shopId,
      payload,
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /products/[item_id]/info]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
