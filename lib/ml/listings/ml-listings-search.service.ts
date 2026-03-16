/**
 * Busca server-side de anúncios no banco local ml_listings.
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

export function normalizeSearchTerm(term: string): string {
  return term
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, ' ')
}

export function detectSearchType(q: string): 'item_id' | 'sku' | 'ean' | 'text' {
  const clean = q.trim().toUpperCase()
  if (clean.startsWith('MLB')) return 'item_id'
  if (/^\d{8,14}$/.test(q.trim())) return 'ean'
  if (!q.includes(' ') && q.length <= 50) return 'sku'
  return 'text'
}

const SORT_MAP: Record<
  NonNullable<ListingsSearchQuery['sort']>,
  { column: string; ascending: boolean }
> = {
  title_asc:    { column: 'title',         ascending: true  },
  title_desc:   { column: 'title',         ascending: false },
  price_asc:    { column: 'price',         ascending: true  },
  price_desc:   { column: 'price',         ascending: false },
  stock_asc:    { column: 'stock',         ascending: true  },
  stock_desc:   { column: 'stock',         ascending: false },
  sold_desc:    { column: 'sold_quantity', ascending: false },
  updated_desc: { column: 'synced_at',     ascending: false },
}

export async function searchLocalListings(
  userId:   string,
  params:   ListingsSearchQuery,
  supabase: SupabaseClient,
): Promise<ListingsSearchResult> {
  const {
    q        = '',
    status   = 'active',
    catalog_tab = 'all',
    page     = 1,
    per_page = 50,
    sort     = 'updated_desc',
  } = params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('ml_listings')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)

  if (status && status !== 'all') query = query.eq('status', status)
  if (catalog_tab === 'user')     query = query.eq('catalog_listing', false)
  if (catalog_tab === 'catalog')  query = query.eq('catalog_listing', true)

  let matchedBy: ListingsSearchResult['search_info']['matched_by'] = 'all'
  if (q.trim()) {
    const searchType = detectSearchType(q)
    const normalized = normalizeSearchTerm(q)
    matchedBy = searchType === 'text' ? 'title' : searchType

    switch (searchType) {
      case 'item_id':
        query = query.ilike('item_id', `%${q.trim()}%`)
        break
      case 'ean':
        query = query.ilike('ean', `%${q.trim()}%`)
        break
      case 'sku':
        query = query.or(
          `seller_sku.ilike.%${normalized}%,title.ilike.%${normalized}%`,
        )
        break
      case 'text':
      default:
        query = query.ilike('title', `%${normalized}%`)
        break
    }
  }

  const s = SORT_MAP[sort] ?? SORT_MAP.updated_desc
  query = query.order(s.column, { ascending: s.ascending })

  const from = (page - 1) * per_page
  const to   = from + per_page - 1
  query = query.range(from, to)

  const { data, count, error } = await query

  if (error) throw new Error(error.message)

  const total      = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / per_page))

  const items: ListingRowViewModel[] = Array.isArray(data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (data as any[]).map((row: Record<string, unknown>) => ({
        item_id:         String(row.item_id ?? ''),
        user_product_id: row.user_product_id ? String(row.user_product_id) : undefined,
        title:           String(row.title ?? ''),
        thumbnail:       row.thumbnail ? String(row.thumbnail) : undefined,
        status:          String(row.status ?? ''),
        listing_type:    String(row.listing_type ?? ''),
        catalog_listing: Boolean(row.catalog_listing),
        price:           Number(row.price ?? 0),
        stock:           Number(row.stock ?? 0),
        sold_quantity:   Number(row.sold_quantity ?? 0),
        seller_sku:      row.seller_sku ? String(row.seller_sku) : undefined,
        ean:             row.ean ? String(row.ean) : undefined,
        synced_at:       String(row.synced_at ?? ''),
      }))
    : []

  return {
    items,
    pagination: {
      total,
      page,
      per_page,
      total_pages: totalPages,
      from:        total === 0 ? 0 : from + 1,
      to:          Math.min(to + 1, total),
    },
    search_info: {
      query:      q,
      matched_by: q.trim() ? matchedBy : null,
      source:     'local_db',
    },
  }
}
