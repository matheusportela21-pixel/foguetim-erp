/**
 * GET /api/mercadolivre/promocoes/em-promocao
 *
 * Retorna TODOS os itens que estão em promoções ativas ou pendentes,
 * com cálculo de "Você recebe" e indicação de subsídio ML.
 *
 * Algoritmo:
 *  1. Lista todas as promoções (started + pending)
 *  2. Para cada promoção, busca os items
 *  3. Para DEAL/DOD, calcula subsídio ML
 *  4. Enriquece com dados locais (ml_listings → title, thumbnail, price)
 *  5. Retorna lista unificada com breakdown financeiro
 */
import { NextResponse }              from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { getMLConnection, mlFetch }  from '@/lib/mercadolivre'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { getCommissionForCategory }  from '@/lib/pricing/ml-tariffs'

/* ── Comissão padrão quando categoria desconhecida ─────────────────────────── */
const DEFAULT_COMMISSION_PCT = 12

/* ── Estimativa de frete quando sem peso ──────────────────────────────────── */
const DEFAULT_SHIPPING = 18

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface MLPromotion {
  id:          string
  name:        string
  type:        string
  sub_type?:   string
  status:      string
  start_date:  string
  finish_date: string
}

interface MLPromotionItem {
  id:                        string
  status:                    string
  price:                     number
  original_price:            number
  deal_price?:               number
  min_discounted_price?:     number
  suggested_discounted_price?: number
}

export interface EmPromocaoItem {
  mlItemId:       string
  title:          string
  thumbnail:      string
  status:         string
  promotionId:    string
  promotionName:  string
  promotionType:  string
  promotionStatus: string
  originalPrice:  number
  dealPrice:      number
  discountPct:    number
  commissionAmt:  number
  commissionPct:  number
  shippingAmt:    number
  netReceive:     number
  mlSubsidy:      number    // > 0 quando ML paga parte do desconto
  minDiscounted?: number
  suggestedDiscounted?: number
}

export interface EmPromocaoResponse {
  items:        EmPromocaoItem[]
  totalItems:   number
  fetchedAt:    string
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  try {
    /* 1. Busca todas as promoções */
    const promosData = await mlFetch<{ results?: MLPromotion[] }>(
      user.id,
      `/seller-promotions/users/${conn.ml_user_id}/promotions?app_version=v2`,
    )
    const promos = (promosData.results ?? []).filter(
      p => p.status === 'started' || p.status === 'pending',
    )

    /* 2. Para cada promoção, busca items em paralelo */
    const allItems: EmPromocaoItem[] = []

    await Promise.all(promos.map(async promo => {
      try {
        const itemsData = await mlFetch<{ results?: MLPromotionItem[] }>(
          user.id,
          `/seller-promotions/promotions/${promo.id}/items?promotion_type=${promo.type}&app_version=v2`,
        )
        const items = itemsData.results ?? []

        for (const item of items) {
          if (item.status === 'finished') continue

          const dealPrice    = item.deal_price ?? item.price
          const origPrice    = item.original_price ?? item.price
          const discountPct  = origPrice > 0
            ? Math.round((1 - dealPrice / origPrice) * 100)
            : 0

          /* Comissão padrão 12% — sem categoria disponível neste endpoint */
          const commissionPct = DEFAULT_COMMISSION_PCT
          const commissionAmt = Math.round(dealPrice * commissionPct / 100 * 100) / 100
          const shippingAmt   = DEFAULT_SHIPPING
          const netReceive    = Math.max(0, dealPrice - commissionAmt - shippingAmt)

          /* Subsídio ML: para DEAL/DOD, quando o ML define preço abaixo do mínimo do vendedor */
          let mlSubsidy = 0
          if ((promo.type === 'DEAL' || promo.type === 'DOD') && item.min_discounted_price) {
            mlSubsidy = Math.max(0, item.min_discounted_price - dealPrice)
          }

          allItems.push({
            mlItemId:            item.id,
            title:               item.id,   // será enriquecido abaixo
            thumbnail:           '',
            status:              item.status,
            promotionId:         promo.id,
            promotionName:       promo.name,
            promotionType:       promo.type,
            promotionStatus:     promo.status,
            originalPrice:       origPrice,
            dealPrice,
            discountPct,
            commissionAmt,
            commissionPct,
            shippingAmt,
            netReceive,
            mlSubsidy,
            minDiscounted:       item.min_discounted_price,
            suggestedDiscounted: item.suggested_discounted_price,
          })
        }
      } catch {
        /* Ignorar erros de itens individuais — promoção sem itens retorna 404 */
      }
    }))

    /* 3. Enriquecer com dados do ml_listings (título, thumbnail) */
    if (allItems.length > 0) {
      const itemIds = Array.from(new Set(allItems.map(i => i.mlItemId)))
      const { data: listings } = await supabaseAdmin()
        .from('ml_listings')
        .select('item_id, title, thumbnail')
        .eq('user_id', user.id)
        .in('item_id', itemIds)

      if (listings && listings.length > 0) {
        const listingMap = new Map(listings.map(l => [l.item_id, l]))
        for (const item of allItems) {
          const l = listingMap.get(item.mlItemId)
          if (l) {
            item.title     = l.title
            item.thumbnail = l.thumbnail ?? ''
          }
        }
      }
    }

    return NextResponse.json({
      items:      allItems,
      totalItems: allItems.length,
      fetchedAt:  new Date().toISOString(),
    } satisfies EmPromocaoResponse)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/em-promocao] GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
