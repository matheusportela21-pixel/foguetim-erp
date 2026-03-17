/**
 * GET /api/mercadolivre/ads/advertiser
 * Busca o advertiser_id real via /advertisers/search.
 * Fallback: usa ml_user_id diretamente.
 */
import { NextResponse }                      from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

const ML_ADS  = 'https://api.mercadolibre.com/advertising/MLB'
const ML_BASE = 'https://api.mercadolibre.com/advertising'

async function adsGet(token: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'api-version': '2' },
  })
  const text = await res.text()
  let body: unknown = null
  try { body = JSON.parse(text) } catch { /* non-JSON */ }
  return { status: res.status, body, text: text.slice(0, 500) }
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

    const mlUserId = conn.ml_user_id
    if (!mlUserId) {
      return NextResponse.json({ error: 'ml_user_id não encontrado' }, { status: 400 })
    }

    console.log('[Ads/advertiser] ml_user_id:', mlUserId)

    // ── 1. Tentar busca oficial do advertiser_id ──────────────────────────
    const searchResult = await adsGet(token, `${ML_ADS}/advertisers/search?user_id=${mlUserId}`)
    console.log('[Ads/advertiser] search status:', searchResult.status, '| body:', searchResult.text)

    // Também tentar sem prefixo MLB
    const searchResult2 = await adsGet(token, `${ML_BASE}/advertisers/search?user_id=${mlUserId}`)
    console.log('[Ads/advertiser] search2 status:', searchResult2.status, '| body:', searchResult2.text)

    // ── 2. Extrair advertiser_id real do search ───────────────────────────
    type SearchBody = { results?: { advertiser_id?: number | string }[]; advertiser_id?: number | string }
    let realAdvertiserId: number | string = mlUserId

    const sb = searchResult.body as SearchBody | null
    if (sb?.results?.[0]?.advertiser_id) {
      realAdvertiserId = sb.results[0].advertiser_id
      console.log('[Ads/advertiser] advertiser_id from search:', realAdvertiserId)
    } else if (sb?.advertiser_id) {
      realAdvertiserId = sb.advertiser_id
      console.log('[Ads/advertiser] advertiser_id direct:', realAdvertiserId)
    } else {
      const sb2 = searchResult2.body as SearchBody | null
      if (sb2?.results?.[0]?.advertiser_id) {
        realAdvertiserId = sb2.results[0].advertiser_id
        console.log('[Ads/advertiser] advertiser_id from search2:', realAdvertiserId)
      }
    }

    // ── 3. Testar campanhas com o advertiser_id encontrado ────────────────
    const today = new Date().toISOString().split('T')[0]
    const from  = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]

    const campTest = await adsGet(
      token,
      `${ML_ADS}/advertisers/${realAdvertiserId}/product_ads/campaigns?date_from=${from}&date_to=${today}&limit=1`,
    )
    console.log('[Ads/advertiser] campaigns test status:', campTest.status, '| body:', campTest.text)

    if (campTest.status === 403 || campTest.status === 404) {
      return NextResponse.json({
        error:   'NO_ADS_ACCOUNT',
        message: 'Sem conta de Product Ads ou sem permissão',
        debug:   { mlUserId, realAdvertiserId, searchStatus: searchResult.status, campStatus: campTest.status, campBody: campTest.text },
      })
    }

    return NextResponse.json({
      advertiser_id:   realAdvertiserId,
      advertiser_name: '',
      account_name:    '',
      site_id:         'MLB',
      debug:           { mlUserId, realAdvertiserId, searchStatus: searchResult.status, campStatus: campTest.status, campBody: campTest.text },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Ads/advertiser] unhandled error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
