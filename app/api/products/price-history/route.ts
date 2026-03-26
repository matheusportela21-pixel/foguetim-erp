/**
 * GET /api/products/price-history?product_id=X&channel=ml&days=90
 * Returns price history from price_history table.
 * If table doesn't exist yet, returns demo data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const sp = new URL(req.url).searchParams
  const productId = sp.get('product_id')
  const channel = sp.get('channel') ?? 'ml'
  const days = Number(sp.get('days') ?? 90)

  if (!productId) {
    return NextResponse.json({ error: 'product_id required' }, { status: 400 })
  }

  try {
    const db = supabaseAdmin()
    const since = new Date(Date.now() - days * 86400_000).toISOString()

    const { data, error } = await db
      .from('price_history')
      .select('price, previous_price, recorded_at, source')
      .eq('user_id', dataOwnerId)
      .eq('product_id', productId)
      .eq('channel', channel)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })

    if (error) {
      // Table might not exist yet - return demo data
      return NextResponse.json({
        history: generateDemoHistory(days),
        demo: true,
      })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        history: generateDemoHistory(days),
        demo: true,
      })
    }

    return NextResponse.json({ history: data, demo: false })
  } catch {
    return NextResponse.json({
      history: generateDemoHistory(days),
      demo: true,
    })
  }
}

function generateDemoHistory(days: number) {
  const history: { price: number; previous_price: number; recorded_at: string; source: string }[] = []
  let price = 45.9
  for (let i = days; i >= 0; i -= 7) {
    const date = new Date(Date.now() - i * 86400_000)
    const variation = (Math.random() - 0.5) * 5
    const newPrice = Math.round((price + variation) * 100) / 100
    history.push({
      price: newPrice,
      previous_price: price,
      recorded_at: date.toISOString(),
      source: 'api',
    })
    price = newPrice
  }
  return history
}
