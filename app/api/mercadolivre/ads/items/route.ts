/**
 * GET /api/mercadolivre/ads/items?limit=&offset=
 * Lista anúncios no Product Ads. advertiser_id = ml_user_id da conexão.
 * Header api-version: 2 obrigatório.
 */
import { NextRequest, NextResponse }         from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'

export interface MlAdsItem {
  item_id:         string
  ad_id?:          string | number
  campaign_id?:    number
  status:          'active' | 'paused' | string
  title:           string
  thumbnail:       string
  listing_type_id: string
  catalog_listing: boolean
  buy_box_winner:  boolean
  recommended:     boolean
  metrics_summary?: {
    clicks:                     number
    prints:                     number
    cost:                       number
    cpc:                        number
    acos:                       number
    organic_units_quantity:     number
    direct_items_quantity:      number
    advertising_items_quantity: number
  }
}

interface AdsItemsResponse {
  results?: MlAdsItem[]
  paging?:  { total: number; limit: number; offset: number }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const limit  = searchParams.get('limit')  ?? '50'
  const offset = searchParams.get('offset') ?? '0'
  const advertiserId = conn.ml_user_id

  try {
    const res = await fetch(
      `${ML_ADS}/advertisers/${advertiserId}/product_ads/ads/search?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
    )
    const rawText = await res.text()
    console.log('[ads/items GET] status:', res.status, '| body:', rawText.slice(0, 300))

    let data: AdsItemsResponse = {}
    try { data = JSON.parse(rawText) as AdsItemsResponse } catch { /* non-JSON body */ }

    return NextResponse.json({
      items:  data.results ?? [],
      paging: data.paging  ?? { total: 0, limit: Number(limit), offset: Number(offset) },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/items GET]', msg)
    return NextResponse.json({ items: [], paging: { total: 0, limit: Number(limit), offset: Number(offset) } })
  }
}
