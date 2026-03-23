/**
 * GET /api/armazem/mapeamentos/suggestions
 * Sugestões de mapeamento multi-canal (ML + Shopee).
 * NÃO aplica nenhum mapeamento — apenas retorna sugestões para aprovação.
 *
 * Query params:
 *   channel    — 'mercado_livre' | 'shopee' | 'all' (default: 'all')
 *   limit      — max sugestões retornadas (default: 100)
 *   product_id — filtrar por produto específico do armazém
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  findMappingSuggestions,
  WarehouseProduct,
  ExternalListing,
} from '@/lib/warehouse/auto-mapping'
import { getValidShopeeToken } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import {
  SHOPEE_PATH_ITEM_LIST,
  SHOPEE_PATH_ITEM_INFO,
} from '@/lib/shopee/config'

// ─── Shopee live fetch ─────────────────────────────────────────────────────────

interface ShopeeItemListResp {
  response?: {
    item?: { item_id: number }[]
    has_next_page?: boolean
    next_offset?: number
  }
  error?: string
}

interface ShopeeItemInfoResp {
  response?: {
    item_list?: Array<{
      item_id: number
      item_name: string
      item_sku: string
      price_info?: Array<{ current_price: number }>
      stock_info_v2?: { seller_stock?: Array<{ stock: number }> }
      image?: { image_url_list?: string[] }
    }>
  }
  error?: string
}

/** Busca todos os anúncios ativos da Shopee para um usuário. Falha silenciosamente. */
async function fetchShopeeListings(userId: string): Promise<ExternalListing[]> {
  try {
    const tokenData = await getValidShopeeToken(userId)
    if (!tokenData) return []

    const { accessToken: access_token, shopId: shop_id } = tokenData

    // 1. Coleta todos os item_ids
    const itemIds: number[] = []
    let offset = 0
    const PAGE = 100

    for (let page = 0; page < 10; page++) { // max 1000 itens
      const listResp = await shopeeGet<ShopeeItemListResp>(
        SHOPEE_PATH_ITEM_LIST,
        access_token,
        shop_id,
        { offset, page_size: PAGE, item_status: 'NORMAL' },
      )

      const items = listResp.response?.item ?? []
      itemIds.push(...items.map(i => i.item_id))

      if (!listResp.response?.has_next_page || items.length === 0) break
      offset = listResp.response.next_offset ?? offset + PAGE
    }

    if (itemIds.length === 0) return []

    // 2. Busca detalhes em lotes de 50
    const listings: ExternalListing[] = []
    const BATCH = 50

    for (let i = 0; i < itemIds.length; i += BATCH) {
      const batch = itemIds.slice(i, i + BATCH)

      const infoResp = await shopeeGet<ShopeeItemInfoResp>(
        SHOPEE_PATH_ITEM_INFO,
        access_token,
        shop_id,
        {
          item_id_list:         batch.join(','),
          need_tax_info:        'false',
          need_complaint_policy: 'false',
        },
      )

      for (const item of infoResp.response?.item_list ?? []) {
        listings.push({
          itemId:    String(item.item_id),
          title:     item.item_name,
          sku:       item.item_sku || null,
          ean:       null,
          channel:   'shopee',
          price:     item.price_info?.[0]?.current_price ?? 0,
          stock:     item.stock_info_v2?.seller_stock?.[0]?.stock ?? 0,
          thumbnail: item.image?.image_url_list?.[0] ?? null,
        })
      }

      if (i + BATCH < itemIds.length) {
        await new Promise(r => setTimeout(r, 350)) // respeita rate limit
      }
    }

    return listings
  } catch (err) {
    console.error('[mapeamentos/suggestions] Shopee fetch error:', err)
    return [] // degradação graciosa — não quebra o endpoint
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const sp         = req.nextUrl.searchParams
    const channel    = sp.get('channel') || 'all'
    const limit      = Math.min(200, parseInt(sp.get('limit') || '100', 10))
    const productId  = sp.get('product_id')

    // 1. Produtos do armazém
    let prodQ = db
      .from('warehouse_products')
      .select('id, name, sku, barcode')
      .eq('user_id', dataOwnerId)
      .eq('active', true)
    if (productId) prodQ = prodQ.eq('id', productId)

    const { data: prods, error: prodErr } = await prodQ
    if (prodErr) throw prodErr

    const warehouseProducts: WarehouseProduct[] = (prods ?? []).map(p => ({
      id:  p.id,
      name: p.name,
      sku: p.sku ?? null,
      ean: p.barcode ?? null,
    }))

    if (warehouseProducts.length === 0) {
      return NextResponse.json({ suggestions: [], total: 0 })
    }

    // 2. Mapeamentos existentes
    const { data: existingMaps } = await db
      .from('warehouse_product_mappings')
      .select('warehouse_product_id, channel')
      .eq('user_id', dataOwnerId)

    const existingMappings = (existingMaps ?? []).map(m => ({
      productId: m.warehouse_product_id as number,
      channel:   m.channel as string,
    }))

    // 3. Anúncios externos por canal
    const externalListings: ExternalListing[] = []
    const includeML     = channel === 'all' || channel === 'mercado_livre'
    const includeShopee = channel === 'all' || channel === 'shopee'

    if (includeML) {
      const { data: mlListings } = await db
        .from('ml_listings')
        .select('item_id, seller_sku, ean, title, price, stock, thumbnail')
        .eq('user_id', dataOwnerId)

      for (const l of mlListings ?? []) {
        externalListings.push({
          itemId:    l.item_id,
          title:     l.title,
          sku:       l.seller_sku ?? null,
          ean:       l.ean ?? null,
          channel:   'mercado_livre',
          price:     l.price ?? 0,
          stock:     l.stock ?? 0,
          thumbnail: l.thumbnail ?? null,
        })
      }
    }

    if (includeShopee) {
      const shopeeListings = await fetchShopeeListings(dataOwnerId)
      externalListings.push(...shopeeListings)
    }

    // 4. Engine de match
    const suggestions = findMappingSuggestions(
      warehouseProducts,
      externalListings,
      existingMappings,
    )

    return NextResponse.json({
      suggestions: suggestions.slice(0, limit),
      total: suggestions.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mapeamentos/suggestions GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
