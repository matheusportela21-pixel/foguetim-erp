/**
 * POST /api/armazem/sync-to-marketplace
 *
 * Sincroniza estoque e/ou preço do armazém para o marketplace.
 * SOMENTE executa para mapeamentos com auto_sync_stock = true ou auto_sync_price = true.
 *
 * REGRA ABSOLUTA: Nunca sincronizar sem opt-in explícito do usuário.
 * auto_sync_stock e auto_sync_price são FALSE por padrão.
 *
 * Body: { product_id: number, fields: ('stock' | 'price')[], dry_run?: boolean }
 * dry_run = true → loga o que enviaria mas NÃO chama o ML
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner }           from '@/lib/auth/api-permissions'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { ML_API_BASE }               from '@/lib/mercadolivre'

const RATE_LIMIT_MS = 1100 // ~1 chamada/segundo por mapeamento

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface MLTokenRow {
  access_token:  string
  refresh_token: string
  expires_at:    string | null
  ml_user_id:    string | null
}

/** Obtém token válido — tenta refresh se expirado */
async function getValidMLToken(userId: string): Promise<string | null> {
  const db = supabaseAdmin()

  const { data: conn } = await db
    .from('marketplace_connections')
    .select('access_token, refresh_token, expires_at, ml_user_id')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .eq('is_primary', true)
    .maybeSingle<MLTokenRow>()

  if (!conn) return null

  // Se expira em menos de 5 minutos, tentar refresh
  if (conn.expires_at) {
    const expiresAt = new Date(conn.expires_at).getTime()
    const now = Date.now()
    if (expiresAt - now < 5 * 60 * 1000) {
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
        console.error('[sync-to-marketplace] Refresh token falhou:', e)
      }
    }
  }

  return conn.access_token
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const { product_id, fields, dry_run = false } = body as {
      product_id: number
      fields: ('stock' | 'price')[]
      dry_run?: boolean
    }

    if (!product_id || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: product_id, fields (array de stock|price)' },
        { status: 400 },
      )
    }

    const syncStock = fields.includes('stock')
    const syncPrice = fields.includes('price')

    // Buscar mapeamentos com opt-in ativo para este produto
    const mappingQuery = db
      .from('warehouse_product_mappings')
      .select('id, channel, marketplace_item_id, auto_sync_stock, auto_sync_price')
      .eq('user_id', dataOwnerId)
      .eq('warehouse_product_id', product_id)

    if (syncStock && !syncPrice)  mappingQuery.eq('auto_sync_stock', true)
    else if (!syncStock && syncPrice) mappingQuery.eq('auto_sync_price', true)
    else {
      // stock ou price — qualquer um ativo
      mappingQuery.or('auto_sync_stock.eq.true,auto_sync_price.eq.true')
    }

    const { data: mappings, error: mapErr } = await mappingQuery

    if (mapErr) {
      console.error('[sync-to-marketplace] Erro ao buscar mapeamentos:', mapErr)
      return NextResponse.json({ error: 'Erro ao buscar mapeamentos' }, { status: 500 })
    }

    if (!mappings || mappings.length === 0) {
      return NextResponse.json({ synced: 0, errors: 0, skipped: 0, message: 'Nenhum mapeamento com opt-in ativo' })
    }

    // Buscar inventário atual do produto
    let availableQty = 0
    if (syncStock) {
      const { data: invRows } = await db
        .from('warehouse_inventory')
        .select('available_qty')
        .eq('product_id', product_id)

      availableQty = (invRows ?? []).reduce((sum: number, row: { available_qty: number }) => {
        return sum + Number(row.available_qty ?? 0)
      }, 0)
    }

    // Buscar preço de referência do produto
    let referencePrice = 0
    if (syncPrice) {
      const { data: prod } = await db
        .from('warehouse_products')
        .select('reference_price, cost_price')
        .eq('id', product_id)
        .eq('user_id', dataOwnerId)
        .maybeSingle()

      referencePrice = Number((prod as { reference_price?: number; cost_price?: number } | null)?.reference_price
        ?? (prod as { reference_price?: number; cost_price?: number } | null)?.cost_price
        ?? 0)
    }

    // Obter token ML válido
    const token = dry_run ? 'DRY_RUN_TOKEN' : await getValidMLToken(dataOwnerId)
    if (!token && !dry_run) {
      return NextResponse.json({ error: 'Token ML não encontrado ou expirado' }, { status: 400 })
    }

    let synced = 0
    let errors = 0
    let skipped = 0

    for (const mapping of mappings) {
      const m = mapping as {
        id: number
        channel: string
        marketplace_item_id: string
        auto_sync_stock: boolean
        auto_sync_price: boolean
      }

      // Só sincronizar ML por enquanto — extensível para outros canais futuramente
      if (m.channel !== 'mercado_livre') {
        skipped++
        continue
      }

      const shouldSyncStock = syncStock && m.auto_sync_stock
      const shouldSyncPrice = syncPrice && m.auto_sync_price

      if (!shouldSyncStock && !shouldSyncPrice) {
        skipped++
        continue
      }

      const payload: Record<string, unknown> = {}
      if (shouldSyncStock) payload.available_quantity = availableQty
      if (shouldSyncPrice && referencePrice > 0) payload.price = referencePrice

      if (Object.keys(payload).length === 0) {
        skipped++
        continue
      }

      let syncStatus: 'success' | 'error' | 'skipped' = 'success'
      let errorMsg: string | null = null

      try {
        if (!dry_run) {
          // Rate limit: 1 call/second
          await sleep(RATE_LIMIT_MS)

          const mlRes = await fetch(
            `${ML_API_BASE}/items/${m.marketplace_item_id}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type':  'application/json',
                'Accept':        'application/json',
              },
              body: JSON.stringify(payload),
            },
          )

          if (!mlRes.ok) {
            const errBody = await mlRes.text().catch(() => mlRes.statusText)
            throw new Error(`ML API ${mlRes.status}: ${errBody}`)
          }
        } else {
          console.log('[sync-to-marketplace DRY RUN]', {
            item_id: m.marketplace_item_id,
            payload,
          })
        }

        synced++
      } catch (e: unknown) {
        syncStatus = 'error'
        errorMsg   = e instanceof Error ? e.message : String(e)
        errors++
        console.error('[sync-to-marketplace] Erro ao sincronizar', m.marketplace_item_id, ':', errorMsg)
      }

      // Logar toda tentativa em sync_log
      if (shouldSyncStock) {
        try {
          await db.from('sync_log').insert({
            user_id:             dataOwnerId,
            mapping_id:          m.id,
            channel:             m.channel,
            direction:           'armazem_to_marketplace',
            field:               'stock',
            old_value:           null,
            new_value:           String(availableQty),
            marketplace_item_id: m.marketplace_item_id,
            status:              dry_run ? 'skipped' : syncStatus,
            error_msg:           errorMsg,
          })
        } catch (logErr) { console.error('[sync_log insert stock]', logErr) }
      }

      if (shouldSyncPrice && referencePrice > 0) {
        try {
          await db.from('sync_log').insert({
            user_id:             dataOwnerId,
            mapping_id:          m.id,
            channel:             m.channel,
            direction:           'armazem_to_marketplace',
            field:               'price',
            old_value:           null,
            new_value:           String(referencePrice),
            marketplace_item_id: m.marketplace_item_id,
            status:              dry_run ? 'skipped' : syncStatus,
            error_msg:           errorMsg,
          })
        } catch (logErr) { console.error('[sync_log insert price]', logErr) }
      }

      // Atualizar last_sync_at e last_sync_error no mapeamento
      try {
        await db
          .from('warehouse_product_mappings')
          .update({
            last_sync_at:    new Date().toISOString(),
            last_sync_error: errorMsg,
          })
          .eq('id', m.id)
      } catch (updateErr) { console.error('[sync mapping update]', updateErr) }
    }

    return NextResponse.json({
      synced,
      errors,
      skipped,
      dry_run,
      product_id,
      fields,
      ...(syncStock ? { available_qty: availableQty } : {}),
      ...(syncPrice ? { reference_price: referencePrice } : {}),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[sync-to-marketplace POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
