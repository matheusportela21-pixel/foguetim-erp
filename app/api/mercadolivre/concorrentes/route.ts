/**
 * GET /api/mercadolivre/concorrentes
 *
 * Modo 1 — Espiar vendedor por nickname:
 *   ?nickname={nick}  →  GET /sites/MLB/search?nickname={nick}&limit=20
 *
 * Modo 2 — Saúde dos próprios anúncios:
 *   ?health=true      →  GET /users/{id}/items/search?reputation_health_gauge=unhealthy|warning
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

// ─── ML API shapes ─────────────────────────────────────────────────────────────

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

interface MLUserData {
  nickname?: string
  seller_reputation?: {
    level_id?:           string
    power_seller_status?: string | null
    transactions?:        { completed?: number }
    metrics?:             { claims?: { rate?: number } }
  }
}

interface MLItemBody {
  id:          string
  title:       string
  price:       number
  thumbnail?:  string
  permalink?:  string
  health?:     number
  status?:     string
}

interface MLItemBatchEntry {
  code: number
  body: MLItemBody
}

// ─── Output shapes ─────────────────────────────────────────────────────────────

export interface SellerListing {
  item_id:      string
  title:        string
  price:        number
  sold_quantity:number
  thumbnail:    string
  free_shipping:boolean
  listing_type: string
  condition:    string
  url:          string
}

export interface SellerInfo {
  id:                  number
  nickname:            string
  level:               string
  transactions:        number
  claims_rate:         number
  power_seller_status: string | null
}

export interface HealthItem {
  item_id:   string
  title:     string
  price:     number
  thumbnail: string
  url:       string
  health:    number | null
  status:    string
  gauge:     'unhealthy' | 'warning'
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json(
      { error: 'Conecte sua conta do Mercado Livre em Integrações para usar esta função.', code: 'NOT_CONNECTED' }
    )
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) {
    return NextResponse.json(
      { error: 'Token do Mercado Livre inválido. Reconecte sua conta em Integrações.', code: 'NOT_CONNECTED' }
    )
  }

  const auth: Record<string, string> = { Authorization: `Bearer ${token}` }
  const mlId: number = conn.ml_user_id
  const sp       = new URL(req.url).searchParams
  const nickname = (sp.get('nickname') ?? '').trim()
  const health   = sp.get('health') === 'true'

  try {
    // ── Modo 1: Espiar vendedor por nickname ─────────────────────────────────
    if (nickname) {
      const searchRes = await fetch(
        `${ML_API_BASE}/sites/MLB/search?nickname=${encodeURIComponent(nickname)}&limit=20`,
        { headers: auth }
      )
      if (!searchRes.ok) {
        const txt = await searchRes.text()
        throw new Error(`Busca por nickname falhou (${searchRes.status}): ${txt}`)
      }

      const searchData = await searchRes.json() as MLSearchResponse
      const results = searchData.results ?? []

      // Reputação do vendedor (a partir do 1º resultado)
      let sellerInfo: SellerInfo | null = null
      if (results.length > 0) {
        const firstSeller = results[0].seller
        try {
          const repRes = await fetch(`${ML_API_BASE}/users/${firstSeller.id}`, { headers: auth })
          if (repRes.ok) {
            const d = await repRes.json() as MLUserData
            const rep = d.seller_reputation ?? {}
            sellerInfo = {
              id:                  firstSeller.id,
              nickname:            d.nickname ?? firstSeller.nickname,
              level:               rep.level_id           ?? 'unknown',
              transactions:        rep.transactions?.completed ?? 0,
              claims_rate:         rep.metrics?.claims?.rate   ?? 0,
              power_seller_status: rep.power_seller_status     ?? null,
            }
          }
        } catch { /* silently ignore */ }

        if (!sellerInfo) {
          sellerInfo = {
            id:                  firstSeller.id,
            nickname:            firstSeller.nickname,
            level:               'unknown',
            transactions:        0,
            claims_rate:         0,
            power_seller_status: null,
          }
        }
      }

      const listings: SellerListing[] = results.map(r => ({
        item_id:       r.id,
        title:         r.title,
        price:         r.price,
        sold_quantity: r.sold_quantity,
        thumbnail:     r.thumbnail,
        free_shipping: r.shipping?.free_shipping ?? false,
        listing_type:  r.listing_type_id,
        condition:     r.condition,
        url:           r.permalink,
      }))

      return NextResponse.json({ type: 'nickname', listings, seller: sellerInfo })
    }

    // ── Modo 2: Saúde dos anúncios ───────────────────────────────────────────
    if (health) {
      const [unhealthyRes, warningRes] = await Promise.allSettled([
        fetch(
          `${ML_API_BASE}/users/${mlId}/items/search?reputation_health_gauge=unhealthy&limit=20`,
          { headers: auth }
        ),
        fetch(
          `${ML_API_BASE}/users/${mlId}/items/search?reputation_health_gauge=warning&limit=20`,
          { headers: auth }
        ),
      ])

      const unhealthyIds: string[] = []
      const warningIds:   string[] = []

      if (unhealthyRes.status === 'fulfilled' && unhealthyRes.value.ok) {
        const d = await unhealthyRes.value.json() as { results?: string[] }
        unhealthyIds.push(...(d.results ?? []))
      }
      if (warningRes.status === 'fulfilled' && warningRes.value.ok) {
        const d = await warningRes.value.json() as { results?: string[] }
        warningIds.push(...(d.results ?? []))
      }

      // Detalhes dos itens em lotes de 20
      const allIds  = Array.from(new Set(unhealthyIds.concat(warningIds)))
      const itemMap = new Map<string, MLItemBody>()
      const BATCH   = 20

      for (let i = 0; i < allIds.length; i += BATCH) {
        const batch = allIds.slice(i, i + BATCH)
        try {
          const r = await fetch(
            `${ML_API_BASE}/items?ids=${batch.join(',')}`,
            { headers: auth }
          )
          if (r.ok) {
            const entries = await r.json() as MLItemBatchEntry[]
            for (const entry of entries) {
              if (entry.code === 200 && entry.body?.id) {
                itemMap.set(entry.body.id, entry.body)
              }
            }
          }
        } catch { /* silently ignore — detalhes são opcionais */ }
      }

      const makeItem = (id: string, gauge: 'unhealthy' | 'warning'): HealthItem => {
        const item = itemMap.get(id)
        return {
          item_id:   id,
          title:     item?.title     ?? id,
          price:     item?.price     ?? 0,
          thumbnail: item?.thumbnail ?? '',
          url:       item?.permalink ?? `https://www.mercadolivre.com.br/p/${id}`,
          health:    item?.health    ?? null,
          status:    item?.status    ?? '',
          gauge,
        }
      }

      const unhealthyItems = unhealthyIds.map(id => makeItem(id, 'unhealthy'))
      // Exibe warning somente se não estiver já no unhealthy
      const unhealthySet   = new Set(unhealthyIds)
      const warningItems   = warningIds
        .filter(id => !unhealthySet.has(id))
        .map(id => makeItem(id, 'warning'))

      return NextResponse.json({ type: 'health', unhealthy: unhealthyItems, warning: warningItems })
    }

    return NextResponse.json(
      { error: 'Informe ?nickname={nick} ou ?health=true' },
      { status: 400 }
    )

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML concorrentes GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
