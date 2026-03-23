/**
 * GET /api/mercadolivre/ads/items?limit=&offset=
 * Lista anúncios no Product Ads. advertiser_id = ml_user_id da conexão.
 */
import { NextRequest, NextResponse }         from 'next/server'
import { resolveDataOwner }                  from '@/lib/auth/api-permissions'
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

const EMPTY = (limit: number, offset: number) => ({
  items: [] as MlAdsItem[],
  paging: { total: 0, limit, offset },
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit  = Number(searchParams.get('limit')  ?? '50')
  const offset = Number(searchParams.get('offset') ?? '0')

  try {
    const { dataOwnerId, error } = await resolveDataOwner()
    if (error) return error

    const conn = await getMLConnection(dataOwnerId)
    if (!conn?.connected) return NextResponse.json(EMPTY(limit, offset))

    const token = await getValidToken(dataOwnerId)
    if (!token) return NextResponse.json(EMPTY(limit, offset))

    const advertiserId = conn.ml_user_id
    if (!advertiserId) return NextResponse.json(EMPTY(limit, offset))

    const res = await fetch(
      `${ML_ADS}/advertisers/${advertiserId}/product_ads/ads/search?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
    )
    const rawText = await res.text()
    console.log('[ads/items GET] status:', res.status, '| body:', rawText.slice(0, 300))

    let data: AdsItemsResponse = {}
    try { data = JSON.parse(rawText) as AdsItemsResponse } catch { /* non-JSON */ }

    return NextResponse.json({
      items:  data.results ?? [],
      paging: data.paging  ?? { total: 0, limit, offset },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/items GET]', msg)
    return NextResponse.json(EMPTY(limit, offset))
  }
}
