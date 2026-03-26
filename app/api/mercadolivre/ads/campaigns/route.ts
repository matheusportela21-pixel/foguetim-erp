/**
 * GET /api/mercadolivre/ads/campaigns?limit=&offset=&date_from=&date_to=
 * Lista campanhas do Product Ads. advertiser_id = ml_user_id da conexão.
 */
import { NextRequest, NextResponse }         from 'next/server'
import { resolveDataOwner }                  from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'

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
  paging?:  { total: number; limit: number; offset: number }
}

const EMPTY = (limit: number, offset: number) => ({
  campaigns: [] as MlAdsCampaign[],
  paging: { total: 0, limit, offset },
})

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit    = Number(searchParams.get('limit')     ?? '50')
  const offset   = Number(searchParams.get('offset')    ?? '0')
  const today    = new Date().toISOString().split('T')[0]
  const thirtyAgo = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]
  const dateFrom = searchParams.get('date_from') ?? thirtyAgo
  const dateTo   = searchParams.get('date_to')   ?? today

  try {
    const { dataOwnerId, error } = await resolveDataOwner()
    if (error) return error

    const conn = await getMLConnection(dataOwnerId)
    if (!conn?.connected) return NextResponse.json(EMPTY(limit, offset))

    const token = await getValidToken(dataOwnerId)
    if (!token) return NextResponse.json(EMPTY(limit, offset))

    const advertiserId = conn.ml_user_id
    if (!advertiserId) return NextResponse.json(EMPTY(limit, offset))

    const url = `${ML_ADS}/advertisers/${advertiserId}/product_ads/campaigns?date_from=${dateFrom}&date_to=${dateTo}&limit=${limit}&offset=${offset}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'api-version': '2' },
    })
    const rawText = await res.text()

    let data: CampaignsResponse = {}
    try { data = JSON.parse(rawText) as CampaignsResponse } catch { /* non-JSON */ }

    return NextResponse.json({
      campaigns: data.results ?? [],
      paging:    data.paging  ?? { total: 0, limit, offset },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns GET]', msg)
    return NextResponse.json(EMPTY(limit, offset))
  }
}
