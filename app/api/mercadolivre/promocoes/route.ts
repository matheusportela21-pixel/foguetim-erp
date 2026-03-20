/**
 * GET /api/mercadolivre/promocoes
 * Lista todas as promoções do vendedor.
 * GET /seller-promotions/users/{ml_user_id}/promotions?app_version=v2
 */
import { NextResponse }                    from 'next/server'
import { getAuthUser }                     from '@/lib/server-auth'
import { getMLConnection, mlFetch }        from '@/lib/mercadolivre'

export interface MLPromotion {
  id:          string
  name:        string
  type:        | 'SELLER_CAMPAIGN'
               | 'SELLER_COUPON_CAMPAIGN'
               | 'DEAL'
               | 'DOD'
               | 'MARKETPLACE_CAMPAIGN'
               | 'LIGHTNING'
               | 'PRICE_MATCHING'
               | 'PRICE_MATCHING_MELI_ALL'
               | 'FULL_BENEFIT'
               | 'SMART'
               | 'UNHEALTHY_STOCK'
               | 'VOLUME'
               | 'PRE_NEGOTIATED'
               | 'PRICE_DISCOUNT'
  sub_type:    string
  status:      'candidate' | 'pending' | 'pending_approval' | 'started' | 'finished' | 'paused'
  start_date:  string
  finish_date: string
  items_count?: number
}

interface MLPromotionsResponse {
  results?: MLPromotion[]
  paging?:  { total?: number; limit?: number; offset?: number }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  try {
    const data = await mlFetch<MLPromotionsResponse>(
      user.id,
      `/seller-promotions/users/${conn.ml_user_id}/promotions?app_version=v2`,
    )

    const promotions = data.results ?? []
    return NextResponse.json({ promotions, total: data.paging?.total ?? promotions.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // ML retorna 404 quando o vendedor não tem promoções — tratar como lista vazia
    if (msg.includes('404')) {
      return NextResponse.json({ promotions: [], total: 0 })
    }
    console.error('[promocoes] GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
