/**
 * GET /api/mercadolivre/estoque
 * Lê anúncios da tabela ml_listings e classifica por nível de estoque.
 *
 * Níveis:
 *   ruptura — stock = 0
 *   alerta  — 1 ≤ stock ≤ 5
 *   baixo   — 6 ≤ stock ≤ 20
 *   normal  — stock > 20
 */
import { NextResponse }    from 'next/server'
import { getAuthUser }     from '@/lib/server-auth'
import { supabaseAdmin }   from '@/lib/supabase-admin'

export type StockLevel = 'ruptura' | 'alerta' | 'baixo' | 'normal'

export interface EstoqueItem {
  id:            string
  item_id:       string
  title:         string
  stock:         number
  status:        string
  sold_quantity: number
  thumbnail:     string | null
  seller_sku:    string | null
  price:         number
  level:         StockLevel
  synced_at:     string | null
}

export interface EstoqueSummary {
  ruptura: number
  alerta:  number
  baixo:   number
  normal:  number
  total:   number
}

function getLevel(stock: number): StockLevel {
  if (stock === 0)  return 'ruptura'
  if (stock <= 5)   return 'alerta'
  if (stock <= 20)  return 'baixo'
  return 'normal'
}

const LEVEL_ORDER: Record<StockLevel, number> = {
  ruptura: 0, alerta: 1, baixo: 2, normal: 3,
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('ml_listings')
    .select('id, item_id, title, stock, status, sold_quantity, thumbnail, seller_sku, price, synced_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items: EstoqueItem[] = (data ?? []).map(row => ({
    id:            row.id            as string,
    item_id:       row.item_id       as string,
    title:         row.title         as string,
    stock:         Number(row.stock  ?? 0),
    status:        String(row.status ?? ''),
    sold_quantity: Number(row.sold_quantity ?? 0),
    thumbnail:     (row.thumbnail    as string | null) ?? null,
    seller_sku:    (row.seller_sku   as string | null) ?? null,
    price:         Number(row.price  ?? 0),
    level:         getLevel(Number(row.stock ?? 0)),
    synced_at:     (row.synced_at    as string | null) ?? null,
  }))

  items.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.stock - b.stock)

  const summary: EstoqueSummary = {
    ruptura: items.filter(i => i.level === 'ruptura').length,
    alerta:  items.filter(i => i.level === 'alerta').length,
    baixo:   items.filter(i => i.level === 'baixo').length,
    normal:  items.filter(i => i.level === 'normal').length,
    total:   items.length,
  }

  return NextResponse.json(
    { items, summary },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  )
}
