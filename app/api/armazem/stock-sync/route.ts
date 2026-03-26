/**
 * GET /api/armazem/stock-sync
 *
 * Compara estoque do armazem vs estoque nos marketplaces para produtos mapeados.
 * Somente leitura — nao altera nada nos marketplaces.
 *
 * Fontes:
 *  - Armazem: tabela warehouse_inventory (sum de available_qty por product_id)
 *  - ML: GET /items?ids=X,Y,Z (available_quantity) — batch de ate 20
 *  - Magalu: nao disponivel ainda
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner }          from '@/lib/auth/api-permissions'
import { supabaseAdmin }            from '@/lib/supabase-admin'
import { ML_API_BASE }              from '@/lib/mercadolivre'

interface MLTokenRow {
  access_token:  string
  refresh_token: string
  expires_at:    string | null
}

async function getMLToken(userId: string): Promise<string | null> {
  const db = supabaseAdmin()
  const { data: conn } = await db
    .from('marketplace_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .eq('is_primary', true)
    .maybeSingle<MLTokenRow>()

  if (!conn) return null

  // Refresh if expiring in < 5 min
  if (conn.expires_at) {
    const expiresAt = new Date(conn.expires_at).getTime()
    if (expiresAt - Date.now() < 5 * 60 * 1000) {
      try {
        const appId  = process.env.ML_APP_ID
        const secret = process.env.ML_CLIENT_SECRET
        if (appId && secret) {
          const r = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type:    'refresh_token',
              client_id:     appId,
              client_secret: secret,
              refresh_token: conn.refresh_token,
            }),
          })
          if (r.ok) {
            const tokens = await r.json() as { access_token: string; refresh_token: string; expires_in: number }
            const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            await db
              .from('marketplace_connections')
              .update({
                access_token:  tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at:    newExpires,
                updated_at:    new Date().toISOString(),
              })
              .eq('user_id', userId)
              .eq('marketplace', 'mercadolivre')
              .eq('is_primary', true)
            return tokens.access_token
          }
        }
      } catch (e) {
        console.error('[stock-sync] ML token refresh failed:', e)
      }
    }
  }

  return conn.access_token
}

/** Fetch ML stock for a batch of item IDs (max 20 per request) */
async function fetchMLStock(
  token: string,
  itemIds: string[],
): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {}
  if (itemIds.length === 0) return result

  // ML multi-get: GET /items?ids=MLB1,MLB2,...&attributes=id,available_quantity
  const batches: string[][] = []
  for (let i = 0; i < itemIds.length; i += 20) {
    batches.push(itemIds.slice(i, i + 20))
  }

  for (const batch of batches) {
    try {
      const ids = batch.join(',')
      const url = `${ML_API_BASE}/items?ids=${ids}&attributes=id,available_quantity`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        console.error(`[stock-sync] ML items fetch failed: ${res.status}`)
        for (const id of batch) result[id] = null
        continue
      }
      const items = await res.json() as Array<{ code: number; body: { id: string; available_quantity: number } }>
      for (const item of items) {
        if (item.code === 200 && item.body) {
          result[item.body.id] = item.body.available_quantity ?? 0
        } else {
          // item not found or error
          const itemId = batch[items.indexOf(item)]
          if (itemId) result[itemId] = null
        }
      }
    } catch (e) {
      console.error('[stock-sync] ML batch fetch error:', e)
      for (const id of batch) result[id] = null
    }
  }

  return result
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    // 1. Get all product mappings (warehouse ↔ marketplace)
    const { data: mappings, error: mapErr } = await db
      .from('warehouse_product_mappings')
      .select(
        `id, warehouse_product_id, channel, marketplace_item_id,
         listing_title, listing_sku, mapping_status, auto_sync_stock,
         product:warehouse_products!warehouse_product_id(id, sku, name)`,
      )
      .eq('user_id', dataOwnerId)

    if (mapErr) {
      console.error('[stock-sync] mappings query error:', mapErr)
      return NextResponse.json({ error: 'Erro ao buscar mapeamentos' }, { status: 500 })
    }

    if (!mappings || mappings.length === 0) {
      return NextResponse.json({
        comparisons: [],
        summary: { total: 0, synced: 0, divergent: 0, coverage: 0 },
        source: 'live',
      })
    }

    // 2. Get warehouse inventory — sum available_qty per product
    const productIds = Array.from(new Set(mappings.map(m => m.warehouse_product_id)))
    const { data: invRows } = await db
      .from('warehouse_inventory')
      .select('product_id, available_qty')
      .in('product_id', productIds)

    const warehouseStock: Record<number, number> = {}
    for (const row of invRows ?? []) {
      const pid = row.product_id as number
      warehouseStock[pid] = (warehouseStock[pid] ?? 0) + Number(row.available_qty ?? 0)
    }

    // 3. For ML items — fetch stock from ML API
    const mlItemIds = mappings
      .filter(m => m.channel === 'mercado_livre' && m.marketplace_item_id)
      .map(m => m.marketplace_item_id)

    let mlStock: Record<string, number | null> = {}
    const mlToken = await getMLToken(dataOwnerId)
    if (mlToken && mlItemIds.length > 0) {
      mlStock = await fetchMLStock(mlToken, mlItemIds)
    }

    // 4. Build comparison results
    type MappingRow = typeof mappings[number] & {
      product: { id: number; sku: string; name: string } | null
    }

    const comparisons = (mappings as MappingRow[]).map(m => {
      const wStock = warehouseStock[m.warehouse_product_id] ?? 0
      const mStock = m.channel === 'mercado_livre' ? (mlStock[m.marketplace_item_id] ?? null) : null

      const divergences: string[] = []
      if (mStock !== null && mStock !== wStock) {
        const diff = mStock - wStock
        divergences.push(
          `${m.channel === 'mercado_livre' ? 'ML' : m.channel}: ${diff > 0 ? '+' : ''}${diff} un. de diferenca`,
        )
      }

      return {
        mappingId:        m.id,
        productId:        m.product?.id ?? m.warehouse_product_id,
        productName:      m.product?.name ?? '—',
        sku:              m.product?.sku ?? m.listing_sku ?? '—',
        channel:          m.channel,
        marketplaceItemId: m.marketplace_item_id,
        autoSyncStock:    m.auto_sync_stock ?? false,
        warehouseStock:   wStock,
        mlStock:          m.channel === 'mercado_livre' ? mStock : null,
        magaluStock:      null as number | null, // Magalu stock API not available yet
        hasDivergence:    divergences.length > 0,
        divergences,
      }
    })

    const total     = comparisons.length
    const synced    = comparisons.filter(c => !c.hasDivergence && (c.mlStock !== null || c.magaluStock !== null)).length
    const divergent = comparisons.filter(c => c.hasDivergence).length
    const withData  = comparisons.filter(c => c.mlStock !== null || c.magaluStock !== null).length
    const coverage  = total > 0 ? Math.round((withData / total) * 100) : 0

    return NextResponse.json({
      comparisons,
      summary: { total, synced, divergent, coverage },
      source: 'live',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stock-sync] error:', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
