/**
 * GET /api/mercadolivre/reviews
 *
 * ?item_id={id}  → reviews de um item específico
 * ?summary=true  → resumo de todos os itens com reviews (top 20)
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const REV_BATCH = 5

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ML API shapes
interface MLRatingLevels {
  one_star?:    { total?: number }
  two_stars?:   { total?: number }
  three_stars?: { total?: number }
  four_stars?:  { total?: number }
  five_stars?:  { total?: number }
}

interface MLReview {
  id:             string
  date_created:   string
  rating:         number
  title?:         string
  content?:       string
  likes?:         number
  dislikes?:      number
  reviewer_name?: string
  buying_date?:   string
  status?:        string
  fulfilled?:     boolean
}

interface MLReviewsResponse {
  rating_average?: number
  total?:          number
  rating_levels?:  MLRatingLevels
  reviews?:        MLReview[]
}

interface MLItemsSearchResponse {
  results?: string[]
  paging?:  { total?: number }
}

interface MLItemBatchEntry {
  code: number
  body: { id: string; title: string; thumbnail?: string }
}

// Output shapes
export interface ReviewSummaryItem {
  item_id:          string
  title:            string
  thumbnail:        string
  rating_average:   number
  total_reviews:    number
  rating_levels: {
    one_star:   number
    two_stars:  number
    three_stars:number
    four_stars: number
    five_stars: number
  }
  last_review_date: string
  has_negative:     boolean
}

export interface ReviewItem {
  id:            string
  date_created:  string
  rating:        number
  title:         string
  content:       string
  likes:         number
  dislikes:      number
  reviewer_name: string
  fulfilled:     boolean
}

export interface ItemReviews {
  item_id:       string
  title:         string
  thumbnail:     string
  rating_average:number
  total:         number
  rating_levels: {
    one_star:   number
    two_stars:  number
    three_stars:number
    four_stars: number
    five_stars: number
  }
  reviews: ReviewItem[]
}

function parseLevels(rl: MLRatingLevels | undefined) {
  return {
    one_star:    rl?.one_star?.total    ?? 0,
    two_stars:   rl?.two_stars?.total   ?? 0,
    three_stars: rl?.three_stars?.total ?? 0,
    four_stars:  rl?.four_stars?.total  ?? 0,
    five_stars:  rl?.five_stars?.total  ?? 0,
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json(
      { error: 'Conecte sua conta do Mercado Livre em Integrações.', code: 'NOT_CONNECTED' }
    )
  }

  const token = await getValidToken(user.id)
  if (!token) {
    return NextResponse.json(
      { error: 'Token inválido. Reconecte sua conta.', code: 'NOT_CONNECTED' }
    )
  }

  const auth: Record<string, string> = { Authorization: `Bearer ${token}` }
  const mlId: number = conn.ml_user_id
  const sp     = new URL(req.url).searchParams
  const itemId = (sp.get('item_id') ?? '').trim()
  const summary = sp.get('summary') === 'true'

  try {
    // ── Mode 1: Reviews of a specific item ──────────────────────────────────
    if (itemId) {
      const [revRes, itemRes] = await Promise.allSettled([
        fetch(`${ML_API_BASE}/reviews/item/${itemId}`, { headers: auth }),
        fetch(`${ML_API_BASE}/items/${itemId}`,        { headers: auth }),
      ])

      if (revRes.status === 'rejected' || !revRes.value.ok) {
        return NextResponse.json({ error: 'Reviews não encontrados para este item.' }, { status: 404 })
      }

      const revData = await revRes.value.json() as MLReviewsResponse

      let title     = itemId
      let thumbnail = ''
      if (itemRes.status === 'fulfilled' && itemRes.value.ok) {
        const d = await itemRes.value.json() as { title?: string; thumbnail?: string }
        title     = d.title     ?? itemId
        thumbnail = d.thumbnail ?? ''
      }

      const levels = parseLevels(revData.rating_levels)

      const reviews: ReviewItem[] = (revData.reviews ?? []).map(r => ({
        id:            r.id,
        date_created:  r.date_created,
        rating:        r.rating,
        title:         r.title         ?? '',
        content:       r.content       ?? '',
        likes:         r.likes         ?? 0,
        dislikes:      r.dislikes      ?? 0,
        reviewer_name: r.reviewer_name ?? 'Anônimo',
        fulfilled:     r.fulfilled     ?? false,
      }))

      const result: ItemReviews = {
        item_id:        itemId,
        title,
        thumbnail,
        rating_average: revData.rating_average ?? 0,
        total:          revData.total          ?? reviews.length,
        rating_levels:  levels,
        reviews,
      }

      return NextResponse.json(result, {
        headers: { 'Cache-Control': 'private, max-age=300' },
      })
    }

    // ── Mode 2: Summary of all items with reviews ────────────────────────────
    if (summary) {
      // 1. Get item IDs from seller
      const searchRes = await fetch(
        `${ML_API_BASE}/users/${mlId}/items/search?limit=50`,
        { headers: auth }
      )
      if (!searchRes.ok) {
        throw new Error(`Falha ao buscar itens (${searchRes.status})`)
      }
      const searchData = await searchRes.json() as MLItemsSearchResponse
      const itemIds = searchData.results ?? []

      // 2. Fetch reviews for each item in batches of 5
      interface ReviewAccum {
        item_id:        string
        rating_average: number
        total:          number
        rating_levels:  ReturnType<typeof parseLevels>
        last_review_date: string
      }
      const withReviews: ReviewAccum[] = []

      for (let i = 0; i < itemIds.length; i += REV_BATCH) {
        const batch = itemIds.slice(i, i + REV_BATCH)
        const settled = await Promise.allSettled(
          batch.map(id =>
            fetch(`${ML_API_BASE}/reviews/item/${id}`, { headers: auth })
              .then(r => ({ id, res: r }))
          )
        )

        for (const result of settled) {
          if (result.status === 'rejected') continue
          const { id, res } = result.value
          if (!res.ok) continue  // 404 = no reviews, skip

          const data = await res.json() as MLReviewsResponse
          const total = data.total ?? 0
          if (total === 0) continue

          const levels = parseLevels(data.rating_levels)

          // Get last review date from first review (they come sorted by date desc)
          const lastDate = data.reviews?.[0]?.date_created ?? ''

          withReviews.push({
            item_id:          id,
            rating_average:   data.rating_average ?? 0,
            total,
            rating_levels:    levels,
            last_review_date: lastDate,
          })
        }

        if (i + REV_BATCH < itemIds.length) await sleep(150)
      }

      // 3. Sort by total reviews DESC, take top 20
      withReviews.sort((a, b) => b.total - a.total)
      const top20 = withReviews.slice(0, 20)

      // 4. Fetch item details (title, thumbnail) in batches of 20
      const detailMap = new Map<string, { title: string; thumbnail: string }>()
      const ids20 = top20.map(x => x.item_id)
      const DETAIL_BATCH = 20

      for (let i = 0; i < ids20.length; i += DETAIL_BATCH) {
        const batch = ids20.slice(i, i + DETAIL_BATCH)
        try {
          const r = await fetch(`${ML_API_BASE}/items?ids=${batch.join(',')}`, { headers: auth })
          if (r.ok) {
            const entries = await r.json() as MLItemBatchEntry[]
            for (const entry of entries) {
              if (entry.code === 200 && entry.body?.id) {
                detailMap.set(entry.body.id, {
                  title:     entry.body.title     ?? entry.body.id,
                  thumbnail: entry.body.thumbnail ?? '',
                })
              }
            }
          }
        } catch { /* silently ignore */ }
      }

      // 5. Build final list
      const items: ReviewSummaryItem[] = top20.map(x => {
        const detail = detailMap.get(x.item_id)
        const has_negative = (x.rating_levels.one_star + x.rating_levels.two_stars) > 0
        return {
          item_id:          x.item_id,
          title:            detail?.title     ?? x.item_id,
          thumbnail:        detail?.thumbnail ?? '',
          rating_average:   x.rating_average,
          total_reviews:    x.total,
          rating_levels:    x.rating_levels,
          last_review_date: x.last_review_date,
          has_negative,
        }
      })

      const totalReviews  = items.reduce((s, x) => s + x.total_reviews, 0)
      const overallAvg    = items.length > 0
        ? items.reduce((s, x) => s + x.rating_average * x.total_reviews, 0) / Math.max(totalReviews, 1)
        : 0

      return NextResponse.json(
        {
          items,
          totals: {
            total_items_with_reviews: items.length,
            total_reviews:            totalReviews,
            overall_average:          Math.round(overallAvg * 10) / 10,
            items_with_negative:      items.filter(x => x.has_negative).length,
          },
        },
        { headers: { 'Cache-Control': 'private, max-age=300' } }
      )
    }

    return NextResponse.json(
      { error: 'Informe ?item_id={id} ou ?summary=true' },
      { status: 400 }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML reviews GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
