/**
 * GET /api/shopee/shop/info
 * Retorna informações básicas da loja Shopee conectada.
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_SHOP_INFO } from '@/lib/shopee/config'

export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidShopeeToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Shopee não conectada' }, { status: 404 })

  try {
    const data = await shopeeGet(
      SHOPEE_PATH_SHOP_INFO,
      tokenData.accessToken,
      tokenData.shopId,
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee /shop/info]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
