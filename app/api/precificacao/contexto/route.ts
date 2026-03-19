/**
 * GET /api/precificacao/contexto
 *
 * Retorna dados contextuais para o simulador de precificação:
 *   - Reputação do vendedor ML
 *   - Dados do produto selecionado (warehouse + ml_listing)
 *   - Comissão calculada para a categoria
 *   - Estimativa de frete (quando peso disponível)
 *
 * Query params:
 *   product_id  — ID do produto no warehouse (optional)
 *   ml_item_id  — ID do item no ML ex: MLB123 (optional)
 *
 * LEITURA APENAS — nunca modifica dados no ML.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { mlFetch }                   from '@/lib/mercadolivre'
import {
  getCommissionForCategory,
  estimateShipping,
  mapMLReputation,
  ML_CATEGORY_COMMISSIONS,
} from '@/lib/pricing/ml-tariffs'

interface MLItemRaw {
  id:               string
  title:            string
  price:            number
  listing_type_id:  string   // 'gold_special' | 'gold_pro' | 'bronze' | etc.
  category_id:      string
  seller_id:        number
  shipping:         { free_shipping: boolean; mode: string }
  attributes:       Array<{ id: string; value_struct?: { number: number; unit: string } | null }>
  variations?:      unknown[]
}

interface MLCategoryRaw {
  id:   string
  name: string
  path_from_root: Array<{ id: string; name: string }>
}

interface MLUserRaw {
  id:                string
  seller_reputation: {
    level_id:            string | null  // 'green' | 'yellow' | 'orange' | 'red'
    power_seller_status: string | null  // 'platinum' | 'gold' | 'silver' | null
    transactions: {
      completed: number
      canceled:  number
      period:    string
      ratings:   { negative: number; neutral: number; positive: number }
    }
  }
}

/** Mapeia listing_type_id do ML para 'classic' | 'premium' */
function mapListingType(typeId: string): 'classic' | 'premium' {
  // gold_special = Clássico antigo, gold_pro = Premium, bronze = grátis
  if (typeId === 'gold_pro') return 'premium'
  if (typeId === 'gold_special' || typeId === 'bronze' || typeId === 'free') return 'classic'
  // gold, gold_premium também são Premium
  if (typeId.includes('gold')) return 'premium'
  return 'classic'
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const productId  = searchParams.get('product_id')
  const mlItemId   = searchParams.get('ml_item_id')

  const db = supabaseAdmin()

  try {
    // ── 1. Dados do produto (warehouse) ──────────────────────────────────────
    let product: {
      id:            number | string
      name:          string
      cost_price:    number | null
      weight:        number | null  // kg
      pkg_weight:    number | null  // kg
      length:        number | null  // cm
      width:         number | null  // cm
      height:        number | null  // cm
      ml_item_id:    string | null
    } | null = null

    if (productId) {
      const { data } = await db
        .from('products')
        .select('id, name, cost_price, weight, pkg_weight, length, width, height, ml_item_id')
        .eq('user_id', user.id)
        .eq('id', productId)
        .maybeSingle()
      product = data
    }

    // ── 2. Resolução do ml_item_id ────────────────────────────────────────────
    const resolvedMlItemId = mlItemId || product?.ml_item_id || null

    // ── 3. Dados do ml_listing (tabela local) ────────────────────────────────
    let mlListing: {
      item_id:      string
      title:        string
      price:        number | null
      listing_type: string | null
      status:       string | null
    } | null = null

    if (resolvedMlItemId) {
      const { data } = await db
        .from('ml_listings')
        .select('item_id, title, price, listing_type, status')
        .eq('user_id', user.id)
        .eq('item_id', resolvedMlItemId)
        .maybeSingle()
      mlListing = data
    }

    // ── 4. Conexão ML — buscar reputação e detalhes do item via API ──────────
    let mlReputation: { level: string; powerSellerStatus: string | null; label: string } | null = null
    let mlItemDetail: {
      categoryId:   string | null
      categoryName: string | null
      listingType:  'classic' | 'premium'
      currentPrice: number | null
      freeShipping: boolean
    } | null = null

    // Tentar obter ML connection para este usuário
    const { data: conn } = await db
      .from('marketplace_connections')
      .select('ml_user_id, connected')
      .eq('user_id', user.id)
      .eq('marketplace', 'mercadolivre')
      .eq('connected', true)
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (conn?.connected) {
      // 4a. Reputação do vendedor
      try {
        const mlUser = await mlFetch<MLUserRaw>(user.id, `/users/${conn.ml_user_id}`)
        const rep    = mlUser.seller_reputation
        const level  = mapMLReputation(rep.power_seller_status, rep.level_id)
        const labelMap: Record<string, string> = {
          platinum: 'MercadoLíder Platinum',
          gold:     'MercadoLíder Gold',
          silver:   'MercadoLíder Silver',
          green:    'Reputação Verde',
          yellow:   'Reputação Amarela',
          none:     'Sem reputação',
        }
        mlReputation = { level, powerSellerStatus: rep.power_seller_status, label: labelMap[level] ?? level }
      } catch (err) {
        console.warn('[precificacao/contexto] Não foi possível buscar reputação ML:', err)
      }

      // 4b. Detalhes do item ML (categoria, tipo de anúncio)
      if (resolvedMlItemId) {
        try {
          const item = await mlFetch<MLItemRaw>(user.id, `/items/${resolvedMlItemId}`)

          // Categoria
          let categoryName: string | null = null
          try {
            const cat = await mlFetch<MLCategoryRaw>(user.id, `/categories/${item.category_id}`)
            categoryName = cat.name
          } catch { /* ignora */ }

          mlItemDetail = {
            categoryId:   item.category_id,
            categoryName,
            listingType:  mapListingType(item.listing_type_id),
            currentPrice: item.price,
            freeShipping: item.shipping?.free_shipping ?? false,
          }
        } catch (err) {
          console.warn('[precificacao/contexto] Não foi possível buscar item ML:', err)
        }
      }
    }

    // ── 5. Comissão calculada ─────────────────────────────────────────────────
    const categoryId   = mlItemDetail?.categoryId ?? null
    const categoryName = mlItemDetail?.categoryName ?? null
    const listingType  = mlItemDetail?.listingType ?? 'classic'
    const commission   = getCommissionForCategory(categoryId, categoryName)
    const commissionPct = listingType === 'premium' ? commission.premiumPct : commission.classicPct

    // ── 6. Frete estimado ─────────────────────────────────────────────────────
    let shippingEstimate: number | null = null
    let effectiveWeightG: number | null = null

    if (product) {
      const productWeightG  = product.weight     ? Math.round(product.weight     * 1000) : null
      const packagingWeightG = product.pkg_weight ? Math.round(product.pkg_weight * 1000) : null
      const realWeightG = (productWeightG ?? 0) + (packagingWeightG ?? 0)

      if (realWeightG > 0) {
        effectiveWeightG = realWeightG
        const repLevel = (mlReputation?.level as Parameters<typeof estimateShipping>[1]) ?? 'none'
        shippingEstimate = estimateShipping(realWeightG, repLevel)
      }
    }

    // ── 7. Lista de categorias para select ───────────────────────────────────
    const categories = ML_CATEGORY_COMMISSIONS.map(c => ({
      name:        c.categoryName,
      classicPct:  c.classicPct,
      premiumPct:  c.premiumPct,
    }))

    return NextResponse.json({
      /** Produto do armazém */
      product: product ? {
        id:           product.id,
        name:         product.name,
        costPrice:    product.cost_price,
        weightG:      product.weight      ? Math.round(product.weight      * 1000) : null,
        pkgWeightG:   product.pkg_weight  ? Math.round(product.pkg_weight  * 1000) : null,
        lengthCm:     product.length,
        widthCm:      product.width,
        heightCm:     product.height,
      } : null,

      /** Listing ML (tabela local) */
      mlListing: mlListing ? {
        itemId:      mlListing.item_id,
        title:       mlListing.title,
        currentPrice: mlListing.price,
        listingType:  mlListing.listing_type,
        status:       mlListing.status,
      } : null,

      /** Dados do ML via API (requer conta conectada) */
      mlApi: mlItemDetail ? {
        categoryId:   mlItemDetail.categoryId,
        categoryName: mlItemDetail.categoryName,
        listingType:  mlItemDetail.listingType,
        currentPrice: mlItemDetail.currentPrice,
        freeShipping: mlItemDetail.freeShipping,
      } : null,

      /** Reputação do vendedor */
      reputation: mlReputation,

      /** Comissão calculada */
      commission: {
        categoryName: commission.categoryName,
        classicPct:   commission.classicPct,
        premiumPct:   commission.premiumPct,
        appliedPct:   commissionPct,
        listingType,
      },

      /** Estimativa de frete (null se sem dados de peso) */
      shipping: shippingEstimate !== null ? {
        estimated:        shippingEstimate,
        effectiveWeightG,
        isAutoCalculated: true,
      } : null,

      /** ML conectado? */
      mlConnected: !!conn?.connected,

      /** Lista de categorias para o select */
      categories,
    })
  } catch (err) {
    console.error('[precificacao/contexto]', err)
    return NextResponse.json({ error: 'Erro ao buscar contexto de precificação' }, { status: 500 })
  }
}
