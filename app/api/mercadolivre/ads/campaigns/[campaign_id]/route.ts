/**
 * GET   /api/mercadolivre/ads/campaigns/[campaign_id]
 * PATCH /api/mercadolivre/ads/campaigns/[campaign_id]
 *       Body: { status: 'active' | 'paused' }
 * advertiser_id = ml_user_id da conexão (resolvido no servidor)
 */
import { NextRequest, NextResponse }         from 'next/server'
import { resolveDataOwner }                  from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'
import type { MlAdsCampaign }               from '../route'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'

type Params = { params: { campaign_id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const res = await fetch(
      `${ML_ADS}/advertisers/${conn.ml_user_id}/product_ads/campaigns/${params.campaign_id}`,
      { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
    )
    const data = await res.json() as MlAdsCampaign
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns/[id] GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { dataOwnerId, error: authErr } = await resolveDataOwner()
  if (authErr) return authErr

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  let body: { status: 'active' | 'paused' }
  try {
    body = await req.json() as { status: 'active' | 'paused' }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (body.status !== 'active' && body.status !== 'paused') {
    return NextResponse.json({ error: 'status deve ser active ou paused' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${ML_ADS}/advertisers/${conn.ml_user_id}/product_ads/campaigns/${params.campaign_id}`,
      {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'api-version': '2', 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: body.status }),
      },
    )
    const data = await res.json() as MlAdsCampaign
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ads/campaigns/[id] PATCH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
