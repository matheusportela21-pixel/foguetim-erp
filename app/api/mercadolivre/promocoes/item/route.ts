/**
 * POST /api/mercadolivre/promocoes/item
 *   Adiciona item a uma campanha.
 *   POST /seller-promotions/items/{item_id}?app_version=v2
 *   Body: { item_id, promotion_id, promotion_type, deal_price, top_deal_price? }
 *
 * DELETE /api/mercadolivre/promocoes/item
 *   Remove item de uma campanha.
 *   DELETE /seller-promotions/items/{item_id}?promotion_type=...&promotion_id=...&app_version=v2
 *   Body: { item_id, promotion_id, promotion_type }
 */
import { NextRequest, NextResponse }  from 'next/server'
import { getAuthUser }                from '@/lib/server-auth'
import { getMLConnection, mlFetch }   from '@/lib/mercadolivre'
import { supabaseAdmin }              from '@/lib/supabase-admin'

interface AddItemBody {
  item_id:        string
  promotion_id:   string
  promotion_type: string
  deal_price:     number
  top_deal_price?: number
}

interface RemoveItemBody {
  item_id:        string
  promotion_id:   string
  promotion_type: string
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const body = await req.json() as Partial<AddItemBody>
  const { item_id, promotion_id, promotion_type, deal_price, top_deal_price } = body

  if (!item_id || !promotion_id || !promotion_type || deal_price === undefined) {
    return NextResponse.json(
      { error: 'item_id, promotion_id, promotion_type e deal_price são obrigatórios' },
      { status: 400 },
    )
  }
  if (deal_price <= 0) {
    return NextResponse.json({ error: 'deal_price deve ser maior que zero' }, { status: 400 })
  }

  try {
    const payload: Record<string, unknown> = { promotion_id, promotion_type, deal_price }
    if (top_deal_price) payload.top_deal_price = top_deal_price

    await mlFetch(
      user.id,
      `/seller-promotions/items/${item_id}?app_version=v2`,
      { method: 'POST', body: JSON.stringify(payload) },
    )

    void supabaseAdmin().from('activity_logs').insert({
      user_id:     user.id,
      action:      'ml.promocao.adicionar_item',
      category:    'integracao',
      description: `Item ${item_id} adicionado à promoção #${promotion_id} com preço R$ ${deal_price}`,
      metadata:    { item_id, promotion_id, promotion_type, deal_price },
      visibility:  'user',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/item] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const body = await req.json() as Partial<RemoveItemBody>
  const { item_id, promotion_id, promotion_type } = body

  if (!item_id || !promotion_id || !promotion_type) {
    return NextResponse.json(
      { error: 'item_id, promotion_id e promotion_type são obrigatórios' },
      { status: 400 },
    )
  }

  try {
    await mlFetch(
      user.id,
      `/seller-promotions/items/${item_id}?promotion_type=${promotion_type}&promotion_id=${promotion_id}&app_version=v2`,
      { method: 'DELETE' },
    )

    void supabaseAdmin().from('activity_logs').insert({
      user_id:     user.id,
      action:      'ml.promocao.remover_item',
      category:    'integracao',
      description: `Item ${item_id} removido da promoção #${promotion_id}`,
      metadata:    { item_id, promotion_id, promotion_type },
      visibility:  'user',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/item] DELETE error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
