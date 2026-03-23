/**
 * GET /api/precificacao/simulacao
 *
 * Retorna até 5 produtos do armazém que têm custo cadastrado e anúncio ML vinculado,
 * para exibição no painel de Simulação Real da precificação.
 *
 * LEITURA APENAS — nunca modifica dados.
 */
import { NextResponse }  from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const db = supabaseAdmin()

  try {
    // Produtos com custo e ml_item_id (da tabela products do armazém)
    const { data: products, error: prodErr } = await db
      .from('products')
      .select('id, name, cost_price, weight_g, ml_item_id')
      .eq('user_id', dataOwnerId)
      .not('cost_price', 'is', null)
      .not('ml_item_id', 'is', null)
      .gt('cost_price', 0)
      .order('cost_price', { ascending: false })
      .limit(5)

    if (prodErr) throw prodErr
    if (!products?.length) return NextResponse.json({ items: [] })

    // Buscar listings ML correspondentes
    const mlIds = products.map(p => p.ml_item_id).filter(Boolean) as string[]
    const { data: listings } = await db
      .from('ml_listings')
      .select('item_id, title, price, listing_type, status')
      .eq('user_id', dataOwnerId)
      .in('item_id', mlIds)

    const listingMap = new Map((listings ?? []).map(l => [l.item_id, l]))

    const items = products.map(p => ({
      id:          p.id,
      name:        p.name,
      costPrice:   p.cost_price   as number,
      weightG:     p.weight_g     as number | null,
      mlItemId:    p.ml_item_id   as string,
      mlListing:   listingMap.get(p.ml_item_id) ?? null,
    }))

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[precificacao/simulacao]', err)
    return NextResponse.json({ error: 'Erro ao buscar produtos para simulação' }, { status: 500 })
  }
}
