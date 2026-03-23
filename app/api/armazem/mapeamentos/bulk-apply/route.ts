/**
 * POST /api/armazem/mapeamentos/bulk-apply
 * Aplica mapeamentos em lote a partir de sugestões aprovadas pelo usuário.
 *
 * Body: Array de { warehouseProductId, externalItemId, channel, listingTitle?, listingSku? }
 * Máximo 100 por chamada.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface BulkApplyItem {
  warehouseProductId: number
  externalItemId: string
  channel: string
  listingTitle?: string | null
  listingSku?: string | null
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body: unknown = await req.json()

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: 'Body deve ser array não vazio' }, { status: 400 })
    }
    if (body.length > 100) {
      return NextResponse.json({ error: 'Máximo 100 mapeamentos por chamada' }, { status: 400 })
    }

    const items = body as BulkApplyItem[]
    const results = { created: 0, skipped: 0, errors: 0 }

    for (const item of items) {
      if (!item.warehouseProductId || !item.externalItemId || !item.channel) {
        results.errors++
        continue
      }

      // Verifica se já existe mapeamento para esse canal
      const { data: existing } = await db
        .from('warehouse_product_mappings')
        .select('id')
        .eq('user_id', dataOwnerId)
        .eq('warehouse_product_id', item.warehouseProductId)
        .eq('channel', item.channel)
        .maybeSingle()

      if (existing) {
        results.skipped++
        continue
      }

      // Verifica ownership do produto
      const { data: prod } = await db
        .from('warehouse_products')
        .select('id, completion_status')
        .eq('id', item.warehouseProductId)
        .eq('user_id', dataOwnerId)
        .maybeSingle()

      if (!prod) {
        results.errors++
        continue
      }

      const { error: insertErr } = await db
        .from('warehouse_product_mappings')
        .insert({
          user_id:              dataOwnerId,
          warehouse_product_id: item.warehouseProductId,
          channel:              item.channel,
          marketplace_item_id:  item.externalItemId,
          listing_title:        item.listingTitle ?? null,
          listing_sku:          item.listingSku ?? null,
          mapping_status:       'mapped',
        })

      if (insertErr) {
        results.errors++
        continue
      }

      results.created++

      // Atualiza completion_status.mapping = true
      const newStatus = {
        ...((prod.completion_status as Record<string, boolean>) || {}),
        mapping: true,
      }
      await db
        .from('warehouse_products')
        .update({ completion_status: newStatus })
        .eq('id', item.warehouseProductId)
    }

    return NextResponse.json(results)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mapeamentos/bulk-apply POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
