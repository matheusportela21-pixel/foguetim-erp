/**
 * Busca server-side de anúncios no banco local ml_listings.
 * Usa a função SQL search_ml_listings (unaccent + pg_trgm) para busca
 * tolerante a acentos e busca parcial.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ListingsSearchQuery {
  q?:            string
  status?:       string
  catalog_tab?:  'user' | 'catalog' | 'all'
  page:          number
  per_page:      20 | 50 | 100 | 200
  sort?:
    | 'title_asc' | 'title_desc'
    | 'price_asc' | 'price_desc'
    | 'stock_asc' | 'stock_desc'
    | 'sold_desc' | 'updated_desc'
}

export interface ListingRowViewModel {
  item_id:         string
  user_product_id?: string
  title:           string
  thumbnail?:      string
  status:          string
  listing_type:    string
  catalog_listing: boolean
  price:           number
  stock:           number
  sold_quantity:   number
  seller_sku?:     string
  ean?:            string
  synced_at:       string
}

export interface ListingsSearchResult {
  items: ListingRowViewModel[]
  pagination: {
    total:       number
    page:        number
    per_page:    number
    total_pages: number
    from:        number
    to:          number
  }
  search_info: {
    query:       string
    matched_by:  'title' | 'item_id' | 'sku' | 'ean' | 'all' | null
    source:      'local_db' | 'ml_api'
  }
}

export function detectSearchType(q: string): 'item_id' | 'sku' | 'ean' | 'text' {
  const clean = q.trim().toUpperCase()
  if (clean.startsWith('MLB')) return 'item_id'
  if (/^\d{8,14}$/.test(q.trim())) return 'ean'
  if (!q.includes(' ') && q.length <= 50) return 'sku'
  return 'text'
}

// Tipo interno para as linhas retornadas pelo RPC
interface RpcRow {
  id:               string
  item_id:          string
  user_product_id:  string | null
  seller_sku:       string | null
  ean:              string | null
  title:            string
  status:           string
  listing_type:     string
  catalog_listing:  boolean
  price:            number
  stock:            number
  sold_quantity:    number
  thumbnail:        string | null
  synced_at:        string
  total_count:      number
}

export async function searchLocalListings(
  userId:   string,
  params:   ListingsSearchQuery,
  supabase: SupabaseClient,
): Promise<ListingsSearchResult> {
  const {
    q           = '',
    status      = 'active',
    catalog_tab = 'all',
    page        = 1,
    per_page    = 50,
    sort        = 'updated_desc',
  } = params

  const p_status =
    status && status !== 'all' ? status : null

  const p_catalog_listing =
    catalog_tab === 'user'    ? false :
    catalog_tab === 'catalog' ? true  :
    null

  const p_query  = q.trim() || null
  const p_offset = (page - 1) * per_page

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('search_ml_listings', {
    p_user_id:        userId,
    p_query,
    p_status,
    p_catalog_listing,
    p_sort:           sort,
    p_limit:          per_page,
    p_offset,
  })

  if (error) throw new Error(error.message)

  const rows: RpcRow[] = Array.isArray(data) ? data : []
  const total          = rows.length > 0 ? Number(rows[0].total_count) : 0
  const totalPages     = Math.max(1, Math.ceil(total / per_page))

  const items: ListingRowViewModel[] = rows.map(row => ({
    item_id:         row.item_id,
    user_product_id: row.user_product_id ?? undefined,
    title:           row.title,
    thumbnail:       row.thumbnail ?? undefined,
    status:          row.status,
    listing_type:    row.listing_type,
    catalog_listing: row.catalog_listing,
    price:           Number(row.price),
    stock:           Number(row.stock),
    sold_quantity:   Number(row.sold_quantity),
    seller_sku:      row.seller_sku ?? undefined,
    ean:             row.ean ?? undefined,
    synced_at:       row.synced_at,
  }))

  // Determina matched_by para search_info
  let matchedBy: ListingsSearchResult['search_info']['matched_by'] = null
  if (p_query) {
    const t = detectSearchType(p_query)
    matchedBy = t === 'text' ? 'title' : t
  }

  return {
    items,
    pagination: {
      total,
      page,
      per_page,
      total_pages: totalPages,
      from:        total === 0 ? 0 : p_offset + 1,
      to:          Math.min(p_offset + per_page, total),
    },
    search_info: {
      query:      q,
      matched_by: p_query ? matchedBy : null,
      source:     'local_db',
    },
  }
}
