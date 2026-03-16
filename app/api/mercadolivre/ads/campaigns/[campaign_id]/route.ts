/**
 * GET   /api/mercadolivre/ads/campaigns/[campaign_id]?advertiser_id=
 * PATCH /api/mercadolivre/ads/campaigns/[campaign_id]
 *       Body: { advertiser_id: number, status: 'active' | 'paused' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'
import type { MlAdsCampaign }        from '../route'

const ADS_HEADERS = { 'api-version': '2' }

type Params = { params: { campaign_id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const advertiserId = req.nextUrl.searchParams.get('advertiser_id')
  if (!advertiserId) {
    return NextResponse.json({ error: 'advertiser_id obrigatório' }, { status: 400 })
  }

  try {
    const campaign = await mlFetch<MlAdsCampaign>(
      user.id,
      `/advertising/MLB/advertisers/${advertiserId}/product_ads/campaigns/${params.campaign_id}`,
      { headers: ADS_HEADERS },
    )
    return NextResponse.json(campaign)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns/[id] GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { advertiser_id: number; status: 'active' | 'paused' }
  try {
    body = await req.json() as { advertiser_id: number; status: 'active' | 'paused' }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.advertiser_id) {
    return NextResponse.json({ error: 'advertiser_id obrigatório' }, { status: 400 })
  }
  if (body.status !== 'active' && body.status !== 'paused') {
    return NextResponse.json({ error: 'status deve ser active ou paused' }, { status: 400 })
  }

  try {
    const updated = await mlFetch<MlAdsCampaign>(
      user.id,
      `/advertising/MLB/advertisers/${body.advertiser_id}/product_ads/campaigns/${params.campaign_id}`,
      {
        method:  'PATCH',
        body:    JSON.stringify({ status: body.status }),
        headers: ADS_HEADERS,
      },
    )
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns/[id] PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
