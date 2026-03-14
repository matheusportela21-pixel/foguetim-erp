/**
 * GET /api/mercadolivre/concorrentes
 * Busca concorrentes de um produto no Mercado Livre.
 *
 * A busca em /sites/MLB/search é PÚBLICA — não precisa de token.
 * O token ML é usado opcionalmente para identificar o próprio anúncio
 * e para chamadas de reputação de sellers.
 *
 * Query params:
 *   q        termo de busca (obrigatório)
 *   item_id  ID do anúncio próprio (opcional, ex: MLB123456789)
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const REP_BATCH = 5

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── ML API shapes ────────────────────────────────────────────────────────────

interface MLSearchResult {
  id:              string
  title:           string
  price:           number
  sold_quantity:   number
  thumbnail:       string
  seller:          { id: number; nickname: string }
  shipping:        { free_shipping: boolean }
  condition:       string
  listing_type_id: string
  permalink:       string
}

interface MLSearchResponse {
  results?: MLSearchResult[]
}

interface MLUserRep {
  seller_reputation?: {
    level_id?:    string
    transactions?: { completed?: number }
    metrics?:     { claims?: { rate?: number } }
  }
}

interface MLItemResponse {
  id:              string
  title:           string
  price:           number
  sold_quantity?:  number
  listing_type_id: string
  shipping?:       { free_shipping?: boolean }
}

// ─── Output shapes ────────────────────────────────────────────────────────────

interface SellerRep {
  level:        string
  transactions: number
  claims_rate:  number
}

export interface ConcorrenteItem {
  item_id:             string
  title:               string
  price:               number
  sold_quantity:       number
  thumbnail:           string
  seller_id:           number
  seller_nickname:     string
  seller_level:        string
  seller_transactions: number
  seller_claims_rate:  number
  free_shipping:       boolean
  listing_type:        string
  condition:           string
  url:                 string
  is_own:              boolean
}

export interface MeuAnuncio {
  item_id:      string
  title:        string
  price:        number
  sold_quantity:number
  listing_type: string
  free_shipping:boolean
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth — required for session; ML connection optional (search is public)
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn    = await getMLConnection(user.id)
  const token   = conn?.connected ? await getValidToken(user.id) : null
  const myMlId: number | null = conn?.ml_user_id ?? null

  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  const sp     = new URL(req.url).searchParams
  const q      = (sp.get('q') ?? '').trim()
  const itemId = (sp.get('item_id') ?? '').trim()

  if (!q) {
    return NextResponse.json({ error: 'Parâmetro q é obrigatório' }, { status: 400 })
  }

  // ── Helper: fetch seller reputation ────────────────────────────────────────
  async function fetchSellerRep(sellerId: number): Promise<MLUserRep | null> {
    try {
      const r = await fetch(`${ML_API_BASE}/users/${sellerId}`, { headers: authHeaders })
      if (!r.ok) return null
      return await r.json() as MLUserRep
    } catch {
      return null
    }
  }

  try {
    // ── 1. Busca pública por termo ──────────────────────────────────────────
    const searchRes = await fetch(
      `${ML_API_BASE}/sites/MLB/search?q=${encodeURIComponent(q)}&limit=20`
    )
    if (!searchRes.ok) {
      throw new Error(`ML search falhou (${searchRes.status})`)
    }
    const searchData = await searchRes.json() as MLSearchResponse
    const results: MLSearchResult[] = searchData.results ?? []

    // ── 2. Reputação dos sellers em lotes de 5 (Promise.allSettled) ─────────
    const uniqueSellerIds = Array.from(new Set(results.map(r => r.seller.id)))
    const repMap = new Map<number, SellerRep>()

    for (let i = 0; i < uniqueSellerIds.length; i += REP_BATCH) {
      const batch = uniqueSellerIds.slice(i, i + REP_BATCH)

      const settled = await Promise.allSettled(batch.map(id => fetchSellerRep(id)))

      settled.forEach((result, j) => {
        const sellerId = batch[j]
        if (sellerId === undefined) return

        if (result.status === 'fulfilled' && result.value) {
          const rep = result.value.seller_reputation ?? {}
          repMap.set(sellerId, {
            level:        rep.level_id           ?? 'unknown',
            transactions: rep.transactions?.completed ?? 0,
            claims_rate:  rep.metrics?.claims?.rate   ?? 0,
          })
        } else {
          repMap.set(sellerId, { level: 'unknown', transactions: 0, claims_rate: 0 })
        }
      })

      if (i + REP_BATCH < uniqueSellerIds.length) await sleep(100)
    }

    // ── 3. Monta lista de concorrentes ──────────────────────────────────────
    const defaultRep: SellerRep = { level: 'unknown', transactions: 0, claims_rate: 0 }

    const concorrentes: ConcorrenteItem[] = results
      .map(r => {
        const rep = repMap.get(r.seller.id) ?? defaultRep
        return {
          item_id:             r.id,
          title:               r.title,
          price:               r.price,
          sold_quantity:       r.sold_quantity,
          thumbnail:           r.thumbnail,
          seller_id:           r.seller.id,
          seller_nickname:     r.seller.nickname,
          seller_level:        rep.level,
          seller_transactions: rep.transactions,
          seller_claims_rate:  rep.claims_rate,
          free_shipping:       r.shipping?.free_shipping ?? false,
          listing_type:        r.listing_type_id,
          condition:           r.condition,
          url:                 r.permalink,
          is_own:              myMlId !== null && r.seller.id === myMlId,
        }
      })
      .sort((a, b) => b.sold_quantity - a.sold_quantity)

    // ── 4. Meu anúncio ──────────────────────────────────────────────────────
    let meuAnuncio: MeuAnuncio | null = null

    // Prioridade 1: item_id explícito → busca direto na API
    if (itemId) {
      try {
        const itemRes = await fetch(`${ML_API_BASE}/items/${itemId}`, { headers: authHeaders })
        if (itemRes.ok) {
          const d = await itemRes.json() as MLItemResponse
          meuAnuncio = {
            item_id:       d.id,
            title:         d.title,
            price:         d.price,
            sold_quantity: d.sold_quantity ?? 0,
            listing_type:  d.listing_type_id,
            free_shipping: d.shipping?.free_shipping ?? false,
          }
        }
      } catch { /* silently ignore */ }
    }

    // Prioridade 2: encontrou o próprio seller nos resultados
    if (!meuAnuncio) {
      const ownItem = concorrentes.find(c => c.is_own)
      if (ownItem) {
        meuAnuncio = {
          item_id:       ownItem.item_id,
          title:         ownItem.title,
          price:         ownItem.price,
          sold_quantity: ownItem.sold_quantity,
          listing_type:  ownItem.listing_type,
          free_shipping: ownItem.free_shipping,
        }
      }
    }

    return NextResponse.json({ concorrentes, meu_anuncio: meuAnuncio })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML concorrentes GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
