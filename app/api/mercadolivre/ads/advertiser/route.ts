/**
 * GET /api/mercadolivre/ads/advertiser
 * Verifica acesso ao ML Product Ads usando ml_user_id como advertiser_id.
 * Detecta quando o token não tem escopo de publicidade (200 + empty body).
 */
import { NextResponse }                      from 'next/server'
import { getAuthUser }                       from '@/lib/server-auth'
import { getMLConnection, getValidToken }    from '@/lib/mercadolivre'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'

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

    console.log('[Ads/advertiser] ml_user_id:', id)

    // Testar acesso às campanhas
    const res = await fetch(
      `${ML_ADS}/advertisers/${id}/product_ads/campaigns?limit=1`,
      { headers: { Authorization: `Bearer ${token}`, 'api-version': '2' } },
    )
    const body = await res.text()
    console.log('[Ads/advertiser] campaigns status:', res.status, '| body len:', body.length, '| body:', body.slice(0, 200))

    // 200 + body vazio = token sem escopo de publicidade
    if (res.status === 200 && body.trim() === '') {
      return NextResponse.json({
        error:   'NO_ADS_SCOPE',
        message: 'Token sem permissão de publicidade. Reconecte o Mercado Livre em Integrações para conceder acesso ao Product Ads.',
        debug:   { id, status: res.status, bodyLen: body.length },
      })
    }

    if (res.status === 403 || res.status === 404) {
      return NextResponse.json({
        error:   'NO_ADS_ACCOUNT',
        message: 'Sem conta de Product Ads ativa.',
        debug:   { id, status: res.status },
      })
    }

    // Parse para verificar se tem dados
    let parsed: { results?: unknown[] } = {}
    try { parsed = JSON.parse(body) as { results?: unknown[] } } catch { /* ok */ }

    console.log('[Ads/advertiser] campaigns results count:', parsed.results?.length ?? 0)

    return NextResponse.json({
      advertiser_id:   id,
      advertiser_name: '',
      account_name:    '',
      site_id:         'MLB',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Ads/advertiser] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
