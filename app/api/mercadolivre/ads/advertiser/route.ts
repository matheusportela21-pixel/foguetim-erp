/**
 * GET /api/mercadolivre/ads/advertiser
 * Busca o advertiser_id do usuário conectado ao ML Product Ads.
 * Retorna 404-like error se usuário não tiver conta de ads ativa.
 */
import { NextResponse }                    from 'next/server'
import { getAuthUser }                     from '@/lib/server-auth'
import { getMLConnection, mlFetch }        from '@/lib/mercadolivre'

const ADS_HEADERS = { 'api-version': '2' }

interface AdvertiserResult {
  advertiser_id:   number
  advertiser_name: string
  account_name:    string
  site_id:         string
}

interface AdvertiserSearchResponse {
  results?: AdvertiserResult[]
  advertiser_id?: number
  advertiser_name?: string
  account_name?: string
  site_id?: string
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })
  }

  try {
    const data = await mlFetch<AdvertiserSearchResponse>(
      user.id,
      `/advertising/MLB/advertisers/search?user_id=${conn.ml_user_id}`,
      { headers: ADS_HEADERS },
    )

    // API may return a results array or the object directly
    const advertiser: AdvertiserResult | undefined =
      Array.isArray(data.results) && data.results.length > 0
        ? data.results[0]
        : (data.advertiser_id ? (data as unknown as AdvertiserResult) : undefined)

    if (!advertiser) {
      return NextResponse.json(
        { error: 'NO_ADS_ACCOUNT', message: 'Ative o Product Ads no ML primeiro' },
        { status: 404 },
      )
    }

    return NextResponse.json(advertiser)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // 404 from ML → user has no ads account
    if (msg.includes('404')) {
      return NextResponse.json(
        { error: 'NO_ADS_ACCOUNT', message: 'Ative o Product Ads no ML primeiro' },
        { status: 404 },
      )
    }
    console.error('[ads/advertiser GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
