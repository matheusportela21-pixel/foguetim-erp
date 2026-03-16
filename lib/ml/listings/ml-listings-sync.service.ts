/**
 * Sincroniza anúncios do ML para a tabela local ml_listings.
 * Busca item_ids via /users/{uid}/items/search, hidrata em batches de 20
 * e faz upsert no Supabase.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const BATCH    = 20
const PAGE_SIZE = 50
const RATE_MS  = 200   // delay entre batches para respeitar rate-limit ML

const ITEM_FIELDS =
  'id,title,status,listing_type_id,price,available_quantity,sold_quantity,' +
  'thumbnail,catalog_listing,seller_custom_field,last_updated,attributes,user_product_id'

interface RawMLItem {
  id?:                   string
  title?:                string
  status?:               string
  listing_type_id?:      string
  price?:                number
  available_quantity?:   number
  sold_quantity?:        number
  thumbnail?:            string
  catalog_listing?:      boolean
  seller_custom_field?:  string | null
  last_updated?:         string
  user_product_id?:      string | null
  attributes?:           Array<{ id: string; value_name?: string | null }>
}

interface SyncOptions {
  limit?:  number
  status?: string
}

export interface SyncResult {
  synced: number
  updated: number
  errors: number
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export async function syncListingsFromML(
  userId:     string,
  mlUserId:   string,
  token:      string,
  supabase:   SupabaseClient,
  options:    SyncOptions = {},
): Promise<SyncResult> {
  const maxItems = options.limit  ?? 2000
  const status   = options.status ?? 'active'
  const headers  = { Authorization: `Bearer ${token}` }

  console.log('[Sync] Iniciando — userId:', userId, '| mlUserId:', mlUserId, '| status:', status, '| maxItems:', maxItems)

  /* ── 1. Coletar todos os item_ids (paginado) ─────────────────────────── */
  const allItemIds: string[] = []
  let offset = 0

  while (allItemIds.length < maxItems) {
    const statusParam = status === 'all' ? '' : `&status=${status}`
    const url = `https://api.mercadolibre.com/users/${mlUserId}/items/search` +
      `?offset=${offset}&limit=${PAGE_SIZE}${statusParam}`

    const res = await fetch(url, { headers })
    if (!res.ok) {
      console.error('[Sync] Falha ao buscar IDs — status:', res.status, '| url:', url)
      break
    }

    const data: { results?: string[]; paging?: { total: number } } = await res.json()
    const ids = Array.isArray(data.results) ? data.results : []
    console.log(`[Sync] Página offset=${offset}: ${ids.length} IDs (total ML: ${data.paging?.total ?? '?'})`)
    if (ids.length === 0) break

    allItemIds.push(...ids)
    if (ids.length < PAGE_SIZE) break
    offset += PAGE_SIZE
    await sleep(RATE_MS)
  }

  console.log('[Sync] Total de IDs coletados:', allItemIds.length)

  /* ── 2. Hidratar em batches de 20 e fazer upsert ─────────────────────── */
  let synced = 0
  let errors = 0
  const now = new Date().toISOString()

  for (let i = 0; i < allItemIds.length; i += BATCH) {
    const batch = allItemIds.slice(i, i + BATCH)
    try {
      const itemsRes = await fetch(
        `https://api.mercadolibre.com/items?ids=${batch.join(',')}&attributes=${ITEM_FIELDS}`,
        { headers },
      )
      if (!itemsRes.ok) {
        console.error('[Sync] Falha ao hidratar batch — status:', itemsRes.status)
        errors += batch.length
        continue
      }

      const multiget: Array<{ code: number; body: RawMLItem }> = await itemsRes.json()

      const rows = multiget
        .filter((r) => r.code === 200 && r.body?.id)
        .map((r) => {
          const item = r.body
          const ean = item.attributes?.find(
            (a) => ['GTIN', 'EAN', 'UPC'].includes(a.id),
          )?.value_name ?? null

          return {
            user_id:         userId,
            item_id:         item.id!,
            user_product_id: item.user_product_id ?? null,
            seller_sku:      item.seller_custom_field ?? null,
            ean,
            title:           item.title ?? '',
            status:          item.status ?? null,
            listing_type:    item.listing_type_id ?? null,
            catalog_listing: item.catalog_listing ?? false,
            price:           item.price ?? null,
            stock:           item.available_quantity ?? 0,
            sold_quantity:   item.sold_quantity ?? 0,
            thumbnail:       item.thumbnail ?? null,
            ml_last_updated: item.last_updated ?? null,
            synced_at:       now,
          }
        })

      if (rows.length === 0) continue

      const { error } = await supabase
        .from('ml_listings')
        .upsert(rows, { onConflict: 'user_id,item_id' })

      if (error) {
        console.error('[Sync] Upsert error — batch i=' + i + ':', error.message, '| code:', error.code, '| details:', error.details)
        errors += batch.length
      } else {
        synced += rows.length
        if (i % (BATCH * 5) === 0) {
          console.log(`[Sync] Progresso: ${synced} salvos até agora...`)
        }
      }
    } catch (e) {
      console.error('[Sync] Exceção no batch i=' + i + ':', e instanceof Error ? e.message : String(e))
      errors += batch.length
    }

    await sleep(RATE_MS)
  }

  console.log('[Sync] Concluído — synced:', synced, '| errors:', errors)
  return { synced, updated: 0, errors }
}

/** Retorna quantos registros existem para o userId (0 = não sincronizado) */
export async function getLocalListingCount(
  userId:   string,
  supabase: SupabaseClient,
): Promise<number> {
  const { count } = await supabase
    .from('ml_listings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}
