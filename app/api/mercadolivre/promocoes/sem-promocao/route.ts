/**
 * GET /api/mercadolivre/promocoes/sem-promocao
 *
 * Retorna anúncios ativos do vendedor que NÃO estão em nenhuma promoção ativa/pendente.
 *
 * Algoritmo:
 *  1. Busca todos os item_ids em promoções ativas/pendentes (via elegibilidade ou listagem)
 *  2. Busca ml_listings ativos do usuário
 *  3. Filtra os que NÃO estão em promoção
 *  4. Retorna com sugestão de preço promocional (10% off mantendo margem)
 *
 * Query params:
 *   limit  (default 50, max 100)
 *   offset (default 0)
 *   q      busca por título
 */
import { NextRequest, NextResponse }  from 'next/server'
import { resolveDataOwner }           from '@/lib/auth/api-permissions'
import { getMLConnection, mlFetch }   from '@/lib/mercadolivre'
import { supabaseAdmin }              from '@/lib/supabase-admin'

interface MLPromotion {
  id:     string
  type:   string
  status: string
}

interface MLPromotionItem {
  id: string
}

export interface SemPromocaoItem {
  mlItemId:        string
  title:           string
  thumbnail:       string
  price:           number
  status:          string
  suggestedDeal10: number  // preço com 10% de desconto
  suggestedDeal15: number  // preço com 15% de desconto
  suggestedDeal20: number  // preço com 20% de desconto
}

export interface SemPromocaoResponse {
  items:      SemPromocaoItem[]
  total:      number
  fetchedAt:  string
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const sp     = req.nextUrl.searchParams
  const limit  = Math.min(Number(sp.get('limit') ?? 50), 100)
  const offset = Number(sp.get('offset') ?? 0)
  const q      = sp.get('q')?.toLowerCase() ?? ''

  try {
    /* 1. Busca item_ids que ESTÃO em promoções ativas/pendentes */
    const promosData = await mlFetch<{ results?: MLPromotion[] }>(
      dataOwnerId,
      `/seller-promotions/users/${conn.ml_user_id}/promotions?app_version=v2`,
    ).catch(() => ({ results: [] as MLPromotion[] }))

    const activePromos = (promosData.results ?? []).filter(
      p => p.status === 'started' || p.status === 'pending',
    )

    /* Coleta item_ids em promoção (em paralelo, no máximo 5 promoções para não throttle) */
    const promoItemIds = new Set<string>()
    const promoBatch = activePromos.slice(0, 5)

    await Promise.all(promoBatch.map(async promo => {
      try {
        const data = await mlFetch<{ results?: MLPromotionItem[] }>(
          dataOwnerId,
          `/seller-promotions/promotions/${promo.id}/items?promotion_type=${promo.type}&app_version=v2`,
        )
        for (const item of data.results ?? []) {
          if (item.id) promoItemIds.add(item.id)
        }
      } catch { /* ignora */ }
    }))

    /* 2. Busca ml_listings ativos do usuário NO banco local */
    let query = supabaseAdmin()
      .from('ml_listings')
      .select('item_id, title, thumbnail, price, status')
      .eq('user_id', dataOwnerId)
      .eq('status', 'active')
      .order('price', { ascending: false })
      .range(offset, offset + limit + promoItemIds.size - 1)  // margem para filtrar

    if (q) {
      query = query.ilike('title', `%${q}%`)
    }

    const { data: listings, error } = await query

    if (error) throw new Error(error.message)

    /* 3. Filtra os que NÃO estão em promoção */
    const semPromocao = (listings ?? [])
      .filter(l => !promoItemIds.has(l.item_id))
      .slice(0, limit)

    /* 4. Monta resposta com sugestões de preço */
    const items: SemPromocaoItem[] = semPromocao.map(l => {
      const p = Number(l.price) || 0
      return {
        mlItemId:        l.item_id,
        title:           l.title,
        thumbnail:       l.thumbnail ?? '',
        price:           p,
        status:          l.status ?? 'active',
        suggestedDeal10: Math.floor(p * 0.90 * 100) / 100,
        suggestedDeal15: Math.floor(p * 0.85 * 100) / 100,
        suggestedDeal20: Math.floor(p * 0.80 * 100) / 100,
      }
    })

    return NextResponse.json({
      items,
      total:     items.length,
      fetchedAt: new Date().toISOString(),
    } satisfies SemPromocaoResponse)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/sem-promocao] GET error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
