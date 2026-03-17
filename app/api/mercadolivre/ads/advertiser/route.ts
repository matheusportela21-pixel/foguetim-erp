/**
 * GET /api/mercadolivre/ads/advertiser
 * Diagnóstico avançado: testa variações com e sem api-version header.
 */
import { NextResponse }                      from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

async function probe(token: string, url: string, extraHeaders?: Record<string, string>) {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
    })
    const body = await res.text()
    const ct = res.headers.get('content-type') ?? ''
    console.log(`[probe] ${url} → ${res.status} | body(200): ${body.slice(0, 200)}`)
    return { url, status: res.status, body: body.slice(0, 400), ct }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { url, status: -1, body: msg, ct: '' }
  }
}

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const conn = await getMLConnection(user.id)
    if (!conn?.connected) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

    const token = await getValidToken(user.id)
    if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const id = conn.ml_user_id
    if (!id) return NextResponse.json({ error: 'ml_user_id ausente' }, { status: 400 })

    // Verificar escopo do token atual
    const tokenScope = await probe(token, `https://api.mercadolibre.com/oauth/token/info`, { 'api-version': '2' })

    const probes = await Promise.all([
      // Sem api-version header (antigo formato)
      probe(token, `https://api.mercadolibre.com/advertising/MLB/advertisers/${id}/product_ads/campaigns?limit=1`),
      // Com api-version: 2
      probe(token, `https://api.mercadolibre.com/advertising/MLB/advertisers/${id}/product_ads/campaigns?limit=1`, { 'api-version': '2' }),
      // Endpoint de detalhes do advertiser
      probe(token, `https://api.mercadolibre.com/advertising/MLB/advertisers/${id}`, { 'api-version': '2' }),
      // Sem MLB, sem api-version
      probe(token, `https://api.mercadolibre.com/advertising/advertisers/${id}/product_ads/campaigns?limit=1`),
      // Check token scope via users/me
      probe(token, `https://api.mercadolibre.com/users/me`),
      // ML Ads advertiser por site
      probe(token, `https://api.mercadolibre.com/advertising/advertisers/${id}`, { 'api-version': '2' }),
    ])

    return NextResponse.json({
      advertiser_id:   id,
      advertiser_name: '',
      account_name:    '',
      site_id:         'MLB',
      debug:           { id, tokenScope, probes },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Ads/advertiser] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
