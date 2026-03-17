/**
 * GET /api/mercadolivre/promocoes/elegibilidade?item_id=MLB...
 * Verifica promoções ativas e elegibilidade de um item.
 * GET /seller-promotions/items/{item_id}?app_version=v2
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { getMLConnection, mlFetch }  from '@/lib/mercadolivre'

interface MLEligibilityPromotion {
  id:             string
  type:           string
  status:         string
  deal_price?:    number
  original_price?: number
  start_date?:    string
  finish_date?:   string
}

interface MLItemEligibilityResponse {
  id?:         string
  promotions?: MLEligibilityPromotion[]
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const itemId = req.nextUrl.searchParams.get('item_id')
  if (!itemId) {
    return NextResponse.json({ error: 'item_id é obrigatório' }, { status: 400 })
  }

  try {
    const data = await mlFetch<MLItemEligibilityResponse>(
      user.id,
      `/seller-promotions/items/${itemId}?app_version=v2`,
    )
    return NextResponse.json({
      item_id:    itemId,
      promotions: data.promotions ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/elegibilidade] GET error:', msg)
    // 404 do ML = item sem promoção ativa — retornar vazio
    if (msg.includes('404')) {
      return NextResponse.json({ item_id: itemId, promotions: [] })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
