/**
 * GET  /api/mercadolivre/promocoes/[promotion_id]
 *   ?promotion_type=SELLER_CAMPAIGN — itens da promoção
 *   GET /seller-promotions/promotions/{id}/items?promotion_type=...&app_version=v2
 *
 * DELETE /api/mercadolivre/promocoes/[promotion_id]
 *   ?promotion_type=SELLER_CAMPAIGN — encerrar promoção
 *   DELETE /seller-promotions/promotions/{id}?promotion_type=...&app_version=v2
 */
import { NextRequest, NextResponse }        from 'next/server'
import { getAuthUser }                      from '@/lib/server-auth'
import { getMLConnection, mlFetch }         from '@/lib/mercadolivre'
import { supabaseAdmin }                    from '@/lib/supabase-admin'

export interface MLPromotionItem {
  id:                        string
  status:                    'candidate' | 'active' | 'paused' | 'finished'
  price:                     number
  original_price:            number
  deal_price?:               number
  min_discounted_price?:     number
  suggested_discounted_price?: number
}

interface MLItemsResponse {
  results?: MLPromotionItem[]
  paging?:  { total?: number }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { promotion_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const promotionType = req.nextUrl.searchParams.get('promotion_type') ?? 'SELLER_CAMPAIGN'

  try {
    const data = await mlFetch<MLItemsResponse>(
      user.id,
      `/seller-promotions/promotions/${params.promotion_id}/items?promotion_type=${promotionType}&app_version=v2`,
    )
    return NextResponse.json({ items: data.results ?? [], total: data.paging?.total ?? 0 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/items] GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { promotion_id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const promotionType = req.nextUrl.searchParams.get('promotion_type') ?? 'SELLER_CAMPAIGN'

  try {
    await mlFetch(
      user.id,
      `/seller-promotions/promotions/${params.promotion_id}?promotion_type=${promotionType}&app_version=v2`,
      { method: 'DELETE' },
    )

    void supabaseAdmin().from('activity_logs').insert({
      user_id:     user.id,
      action:      'ml.promocao.encerrar',
      category:    'integracao',
      description: `Promoção #${params.promotion_id} encerrada`,
      metadata:    { promotion_id: params.promotion_id, promotion_type: promotionType },
      visibility:  'user',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes] DELETE error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
