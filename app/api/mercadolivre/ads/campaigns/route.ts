/**
 * GET /api/mercadolivre/ads/campaigns?limit=&offset=
 * Lista campanhas do Product Ads. advertiser_id = ml_user_id da conexão.
 * Header api-version: 2 obrigatório.
 */
import { NextRequest, NextResponse }         from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
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
      `${ML_ADS}/advertisers/${advertiserId}/product_ads/campaigns?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
    )
    const rawText = await res.text()
    console.log('[ads/campaigns GET] status:', res.status, '| body:', rawText.slice(0, 300))

    let data: CampaignsResponse = {}
    try { data = JSON.parse(rawText) as CampaignsResponse } catch { /* non-JSON body */ }

    return NextResponse.json({
      campaigns: data.results ?? [],
      paging:    data.paging  ?? { total: 0, limit: Number(limit), offset: Number(offset) },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns GET]', msg)
    return NextResponse.json({ campaigns: [], paging: { total: 0, limit: Number(limit), offset: Number(offset) } })
  }
}
