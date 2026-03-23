/**
 * GET /api/mercadolivre/promocoes/elegibilidade?item_id=MLB...
 * Verifica promoções ativas e elegibilidade de um item.
 * GET /seller-promotions/items/{item_id}?app_version=v2
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner }          from '@/lib/auth/api-permissions'
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
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const itemId = req.nextUrl.searchParams.get('item_id')
  if (!itemId) {
    return NextResponse.json({ error: 'item_id é obrigatório' }, { status: 400 })
  }

  try {
    const data = await mlFetch<MLItemEligibilityResponse>(
      dataOwnerId,
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
