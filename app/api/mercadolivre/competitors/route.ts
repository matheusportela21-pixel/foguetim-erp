/**
 * GET /api/mercadolivre/competitors?item_id=MLB123456
 *
 * Searches for similar items in the same category and returns price comparison data.
 * 1. Get the item details (title, category, price)
 * 2. Search MLB for similar items in same category
 * 3. Calculate stats (min, max, avg, position)
 * 4. Return comparison data
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

// ─── ML API shapes ─────────────────────────────────────────────────────────────

interface MLItemDetail {
  id:          string
  title:       string
  price:       number
  category_id: string
  thumbnail:   string
  permalink:   string
  condition:   string
}

interface MLSearchResult {
  id:              string
  title:           string
  price:           number
  seller:          { id: number; nickname: string }
  shipping:        { free_shipping: boolean }
  condition:       string
  permalink:       string
  thumbnail:       string
}

interface MLSearchResponse {
  results?: MLSearchResult[]
  paging?:  { total: number }
}

// ─── Output shapes ─────────────────────────────────────────────────────────────

export interface CompetitorEntry {
  seller_nickname: string
  price:           number
  free_shipping:   boolean
  condition:       string
  url:             string
}

export interface CompetitorAnalysis {
  item_id:       string
  title:         string
  your_price:    number
  category_id:   string
  thumbnail:     string
  min_price:     number
  max_price:     number
  avg_price:     number
  total_sellers: number
  your_position: number
  status:        'below' | 'average' | 'above'
  competitors:   CompetitorEntry[]
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json(
      { error: 'Conecte sua conta do Mercado Livre em Integracoes.', code: 'NOT_CONNECTED' }
    )
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) {
    return NextResponse.json(
      { error: 'Token do Mercado Livre invalido. Reconecte em Integracoes.', code: 'NOT_CONNECTED' }
    )
  }

  const auth: Record<string, string> = { Authorization: `Bearer ${token}` }
  const sp     = new URL(req.url).searchParams
  const itemId = (sp.get('item_id') ?? '').trim()

  if (!itemId) {
    return NextResponse.json({ error: 'item_id e obrigatorio' }, { status: 400 })
  }

  try {
    // 1. Get item details
    const itemRes = await fetch(`${ML_API_BASE}/items/${itemId}`, { headers: auth })
    if (!itemRes.ok) {
      return NextResponse.json(
        { error: `Item ${itemId} nao encontrado (${itemRes.status})` },
        { status: 404 }
      )
    }
    const item = await itemRes.json() as MLItemDetail

    // 2. Search for similar items in the same category
    const query = encodeURIComponent(item.title.slice(0, 80))
    const searchUrl = `${ML_API_BASE}/sites/MLB/search?q=${query}&category=${item.category_id}&sort=price_asc&limit=20`
    const searchRes = await fetch(searchUrl, { headers: auth })

    if (!searchRes.ok) {
      return NextResponse.json(
        { error: `Busca por concorrentes falhou (${searchRes.status})` },
        { status: 500 }
      )
    }

    const searchData = await searchRes.json() as MLSearchResponse
    const results = searchData.results ?? []
    const totalSellers = searchData.paging?.total ?? results.length

    // 3. Calculate stats
    const prices = results.map(r => r.price).filter(p => p > 0)
    if (prices.length === 0) {
      return NextResponse.json({
        analysis: {
          item_id:       item.id,
          title:         item.title,
          your_price:    item.price,
          category_id:   item.category_id,
          thumbnail:     item.thumbnail ?? '',
          min_price:     item.price,
          max_price:     item.price,
          avg_price:     item.price,
          total_sellers: 1,
          your_position: 1,
          status:        'average' as const,
          competitors:   [],
        } satisfies CompetitorAnalysis,
      })
    }

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

    // Find position (how many sellers have lower price)
    const lowerCount = prices.filter(p => p < item.price).length
    const yourPosition = lowerCount + 1

    // Determine status
    let status: 'below' | 'average' | 'above' = 'average'
    if (item.price < avgPrice * 0.95) status = 'below'
    else if (item.price > avgPrice * 1.05) status = 'above'

    // 4. Build competitor entries (top 5, excluding own item)
    const mlId = conn.ml_user_id
    const competitors: CompetitorEntry[] = results
      .filter(r => r.seller.id !== mlId && r.id !== itemId)
      .slice(0, 5)
      .map(r => ({
        seller_nickname: r.seller.nickname,
        price:           r.price,
        free_shipping:   r.shipping?.free_shipping ?? false,
        condition:       r.condition,
        url:             r.permalink,
      }))

    const analysis: CompetitorAnalysis = {
      item_id:       item.id,
      title:         item.title,
      your_price:    item.price,
      category_id:   item.category_id,
      thumbnail:     item.thumbnail ?? '',
      min_price:     minPrice,
      max_price:     maxPrice,
      avg_price:     Math.round(avgPrice * 100) / 100,
      total_sellers: totalSellers,
      your_position: yourPosition,
      status,
      competitors,
    }

    return NextResponse.json({ analysis })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML competitors GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
