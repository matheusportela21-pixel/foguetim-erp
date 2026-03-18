/**
 * POST /api/armazem/mapeamentos/auto-suggest
 * Match warehouse products to ml_listings by SKU or EAN
 * Returns SUGGESTIONS only — does NOT create any mappings
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface WarehouseProduct {
  id: number
  sku: string
  name: string
  barcode: string | null
}

interface MlListing {
  item_id: string
  seller_sku: string | null
  ean: string | null
  title: string
  status: string
  thumbnail: string | null
}

interface Candidate {
  item_id: string
  title: string
  seller_sku: string | null
  ean: string | null
  thumbnail: string | null
  status: string
}

interface Suggestion {
  warehouse_product: { id: number; sku: string; name: string }
  match_type: 'no_match' | 'sku_match' | 'ean_match' | 'conflict'
  candidates: Candidate[]
  already_mapped: boolean
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const body = await req.json().catch(() => ({}))
    const product_ids: number[] | undefined = body.product_ids

    // 1. Load warehouse products for this user
    let productsQuery = db
      .from('warehouse_products')
      .select('id, sku, name, barcode')
      .eq('user_id', user.id)

    if (product_ids && product_ids.length > 0) {
      productsQuery = productsQuery.in('id', product_ids)
    }

    const { data: products, error: prodError } = await productsQuery

    if (prodError) {
      console.error('[mapeamentos/auto-suggest products]', prodError)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    const warehouseProducts = (products ?? []) as WarehouseProduct[]

    // 2. Load all ml_listings for this user
    const { data: listings, error: listError } = await db
      .from('ml_listings')
      .select('item_id, seller_sku, ean, title, status, thumbnail')
      .eq('user_id', user.id)

    if (listError) {
      console.error('[mapeamentos/auto-suggest listings]', listError)
      return NextResponse.json({ error: 'Erro ao buscar listagens ML' }, { status: 500 })
    }

    const mlListings = (listings ?? []) as MlListing[]

    // 3. Load existing mappings for this user to detect already_mapped
    const { data: existingMappings } = await db
      .from('warehouse_product_mappings')
      .select('warehouse_product_id, channel')
      .eq('user_id', user.id)

    const mappedProductIds = new Set(
      (existingMappings ?? []).map((m: { warehouse_product_id: number }) => m.warehouse_product_id),
    )

    // 4. Build suggestions
    const suggestions: Suggestion[] = []
    let matched = 0
    let no_match = 0
    let conflict = 0
    let already_mapped_count = 0

    for (const product of warehouseProducts) {
      const already_mapped = mappedProductIds.has(product.id)

      // Try SKU match (case-insensitive)
      const skuMatches = mlListings.filter(
        (l) => l.seller_sku && l.seller_sku.toLowerCase() === product.sku.toLowerCase(),
      )

      let matchType: Suggestion['match_type'] = 'no_match'
      let candidates: Candidate[] = []

      if (skuMatches.length === 1) {
        matchType = 'sku_match'
        candidates = skuMatches.map((l) => ({
          item_id: l.item_id,
          title: l.title,
          seller_sku: l.seller_sku,
          ean: l.ean,
          thumbnail: l.thumbnail,
          status: l.status,
        }))
      } else if (skuMatches.length > 1) {
        matchType = 'conflict'
        candidates = skuMatches.map((l) => ({
          item_id: l.item_id,
          title: l.title,
          seller_sku: l.seller_sku,
          ean: l.ean,
          thumbnail: l.thumbnail,
          status: l.status,
        }))
      } else if (product.barcode) {
        // Try EAN/barcode match
        const eanMatches = mlListings.filter(
          (l) => l.ean && l.ean === product.barcode,
        )

        if (eanMatches.length === 1) {
          matchType = 'ean_match'
          candidates = eanMatches.map((l) => ({
            item_id: l.item_id,
            title: l.title,
            seller_sku: l.seller_sku,
            ean: l.ean,
            thumbnail: l.thumbnail,
            status: l.status,
          }))
        } else if (eanMatches.length > 1) {
          matchType = 'conflict'
          candidates = eanMatches.map((l) => ({
            item_id: l.item_id,
            title: l.title,
            seller_sku: l.seller_sku,
            ean: l.ean,
            thumbnail: l.thumbnail,
            status: l.status,
          }))
        }
      }

      // Tally summary counts
      if (matchType === 'no_match') {
        no_match++
      } else if (matchType === 'conflict') {
        conflict++
      } else {
        matched++
      }
      if (already_mapped) already_mapped_count++

      suggestions.push({
        warehouse_product: { id: product.id, sku: product.sku, name: product.name },
        match_type: matchType,
        candidates,
        already_mapped,
      })
    }

    return NextResponse.json({
      suggestions,
      summary: {
        total: warehouseProducts.length,
        matched,
        no_match,
        conflict,
        already_mapped: already_mapped_count,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mapeamentos/auto-suggest POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
