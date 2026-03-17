/**
 * GET /api/mercadolivre/ads/advertiser
 * No ML Ads, advertiser_id === ml_user_id na maioria dos casos.
 * Valida acesso tentando listar campanhas com o user_id diretamente.
 */
import { NextResponse }                      from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const advertiserId = conn.ml_user_id
  console.log('[Ads/advertiser] ml_user_id / advertiserId:', advertiserId)

  // Valida acesso: tenta listar campanhas com o advertiser_id = ml_user_id
  const testRes = await fetch(
    `${ML_ADS}/advertisers/${advertiserId}/product_ads/campaigns?limit=1`,
    { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
  )
  const testData: unknown = await testRes.json()
  console.log('[Ads/advertiser] campaigns test status:', testRes.status)
  console.log('[Ads/advertiser] campaigns test body:', JSON.stringify(testData))

  if (testRes.status === 404 || testRes.status === 403) {
    return NextResponse.json(
      {
        error:   'NO_ADS_ACCOUNT',
        message: 'Sem conta de Product Ads ou sem permissão',
        debug:   { advertiserId, status: testRes.status, body: testData },
      },
      { status: 200 },
    )
  }

  return NextResponse.json({
    advertiser_id:   advertiserId,
    advertiser_name: '',
    account_name:    '',
    site_id:         'MLB',
    debug:           { advertiserId, status: testRes.status },
  })
}
