/**
 * GET /api/mercadolivre/ads/items?advertiser_id=&limit=&offset=
 * Lista anúncios ativos no Product Ads com métricas.
 * Header api-version: 2 obrigatório.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'

const ADS_HEADERS = { 'api-version': '2' }

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

  const { searchParams } = req.nextUrl
  const advertiserId = searchParams.get('advertiser_id')
  const limit        = searchParams.get('limit')  ?? '50'
  const offset       = searchParams.get('offset') ?? '0'

  if (!advertiserId) {
    return NextResponse.json({ error: 'advertiser_id obrigatório' }, { status: 400 })
  }

  try {
    const data = await mlFetch<AdsItemsResponse>(
      user.id,
      `/advertising/MLB/advertisers/${advertiserId}/product_ads/ads/search?limit=${limit}&offset=${offset}`,
      { headers: ADS_HEADERS },
    )

    return NextResponse.json({
      items:  data.results ?? [],
      paging: data.paging  ?? { total: 0, limit: Number(limit), offset: Number(offset) },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/items GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
