/**
 * GET /api/mercadolivre/ads/advertiser
 * No ML Ads, advertiser_id === ml_user_id na maioria dos casos.
 * Valida acesso tentando listar campanhas com o user_id diretamente.
 */
import { NextResponse }                      from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'

async function safeJson(res: Response): Promise<unknown> {
  try { return await res.json() } catch { return null }
}

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const conn = await getMLConnection(user.id)
    if (!conn?.connected) {
      return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })
    }

    const token = await getValidToken(user.id)
    if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const advertiserId = conn.ml_user_id
    if (!advertiserId) {
      return NextResponse.json({ error: 'ml_user_id não encontrado na conexão' }, { status: 400 })
    }

    console.log('[Ads/advertiser] ml_user_id / advertiserId:', advertiserId)

    // Valida acesso tentando listar campanhas com ml_user_id como advertiser_id
    const testRes = await fetch(
      `${ML_ADS}/advertisers/${advertiserId}/product_ads/campaigns?limit=1`,
      { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
    )
    const testData = await safeJson(testRes)
    console.log('[Ads/advertiser] campaigns test status:', testRes.status)
    console.log('[Ads/advertiser] campaigns test body:', JSON.stringify(testData))

    if (testRes.status === 404 || testRes.status === 403) {
      return NextResponse.json({
        error:   'NO_ADS_ACCOUNT',
        message: 'Sem conta de Product Ads ou sem permissão',
        debug:   { advertiserId, status: testRes.status, body: testData },
      })
    }

    return NextResponse.json({
      advertiser_id:   advertiserId,
      advertiser_name: '',
      account_name:    '',
      site_id:         'MLB',
      debug:           { advertiserId, status: testRes.status, body: testData },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Ads/advertiser] unhandled error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
