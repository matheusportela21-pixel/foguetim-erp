/**
 * GET /api/mercadolivre/ads/advertiser
 * Diagnóstico: testa múltiplos endpoints ML Ads para encontrar o correto.
 */
import { NextResponse }                      from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

async function probe(token: string, url: string): Promise<{ url: string; status: number; body: string; headers: string }> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'api-version': '2' },
    })
    const body = await res.text()
    const ct = res.headers.get('content-type') ?? ''
    console.log(`[probe] ${url} → ${res.status} | ct: ${ct} | body: ${body.slice(0, 200)}`)
    return { url, status: res.status, body: body.slice(0, 400), headers: ct }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[probe] ${url} → error: ${msg}`)
    return { url, status: -1, body: msg, headers: '' }
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

    const today = new Date().toISOString().split('T')[0]
    const from  = new Date(Date.now() - 30 * 86400_000).toISOString().split('T')[0]

    // Testar todos os formatos possíveis de endpoint em paralelo
    const probes = await Promise.all([
      // 1. Endpoint sem MLB (base), sem datas
      probe(token, `https://api.mercadolibre.com/advertising/advertisers/${id}/product_ads/campaigns`),
      // 2. Endpoint sem MLB, com datas
      probe(token, `https://api.mercadolibre.com/advertising/advertisers/${id}/product_ads/campaigns?date_from=${from}&date_to=${today}`),
      // 3. Endpoint com MLB, sem datas
      probe(token, `https://api.mercadolibre.com/advertising/MLB/advertisers/${id}/product_ads/campaigns`),
      // 4. Endpoint com MLB, com datas
      probe(token, `https://api.mercadolibre.com/advertising/MLB/advertisers/${id}/product_ads/campaigns?date_from=${from}&date_to=${today}`),
      // 5. Search por user_id sem MLB
      probe(token, `https://api.mercadolibre.com/advertising/advertisers/search?user_id=${id}`),
      // 6. Usuário ML (scope check)
      probe(token, `https://api.mercadolibre.com/users/${id}`),
    ])

    // Encontrar o primeiro que retornou dados úteis (status 200 + body não vazio)
    const working = probes.find(p => p.status === 200 && p.body.trim().length > 2)

    if (working?.body.includes('"results"') || working?.body.includes('"id"')) {
      // Extrair advertiser_id do resultado, se possível
      try {
        const parsed = JSON.parse(working.body) as { results?: { advertiser_id?: number }[]; advertiser_id?: number }
        const advertiserId = parsed.results?.[0]?.advertiser_id ?? parsed.advertiser_id ?? id
        return NextResponse.json({
          advertiser_id:   advertiserId,
          advertiser_name: '',
          account_name:    '',
          site_id:         'MLB',
          debug:           { id, probes },
        })
      } catch { /* continue */ }
    }

    // Retornar diagnóstico completo mesmo sem dados
    return NextResponse.json({
      advertiser_id:   id,
      advertiser_name: '',
      account_name:    '',
      site_id:         'MLB',
      debug:           { id, probes },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Ads/advertiser] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
