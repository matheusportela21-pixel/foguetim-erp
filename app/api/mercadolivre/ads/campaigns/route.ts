/**
 * GET /api/mercadolivre/ads/campaigns?advertiser_id=&limit=&offset=
 * Lista campanhas do Product Ads com métricas.
 * Header api-version: 2 obrigatório.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'

const ADS_HEADERS = { 'api-version': '2' }

export interface MlAdsCampaign {
  id:               number
  name:             string
  status:           'active' | 'paused' | string
  strategy:         string
  budget:           number | null
  automatic_budget: boolean
  metrics?: {
    clicks:                    number
    prints:                    number
    cost:                      number
    cpc:                       number
    ctr:                       number
    acos:                      number
    roas:                      number
    direct_amount:             number
    indirect_amount:           number
    total_amount:              number
    units_quantity:            number
    advertising_items_quantity: number
  }
}

interface CampaignsResponse {
  results?: MlAdsCampaign[]
  paging?: { total: number; limit: number; offset: number }
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
    const data = await mlFetch<CampaignsResponse>(
      user.id,
      `/advertising/MLB/advertisers/${advertiserId}/product_ads/campaigns?limit=${limit}&offset=${offset}`,
      { headers: ADS_HEADERS },
    )

    return NextResponse.json({
      campaigns: data.results ?? [],
      paging:    data.paging  ?? { total: 0, limit: Number(limit), offset: Number(offset) },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
