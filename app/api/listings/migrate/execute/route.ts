/**
 * POST /api/listings/migrate/execute
 * Executa migração: extrai dados completos do canal de origem
 * e cria draft_listings no Supabase. NUNCA publica — apenas rascunhos.
 *
 * Body: {
 *   product_ids:    string[]
 *   source_channel: 'ml' | 'magalu'
 *   dest_channel:   'ml' | 'magalu'
 *   duplicate_mode: 'ignore' | 'duplicate'
 * }
 *
 * Return: { success: number, skipped: number, failed: number, errors: { id, error }[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_SKUS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface ExtractedData {
  title: string
  description: string | null
  price: number | null
  original_price: number | null
  images: string[]
  category: string | null
  brand: string | null
  condition: string
  attributes: Record<string, string>
  sku: string | null
  ean: string | null
  source_id: string
  source_marketplace: string
}

/* ─── ML: extrair dados completos de um item ───────────────────────────────── */

async function extractFromML(
  itemId: string,
  token: string,
): Promise<ExtractedData> {
  const auth = { Authorization: `Bearer ${token}` }

  const [itemRes, descRes] = await Promise.all([
    fetch(`${ML_API_BASE}/items/${itemId}`, { headers: auth }),
    fetch(`${ML_API_BASE}/items/${itemId}/description`, { headers: auth }),
  ])

  if (!itemRes.ok) {
    const txt = await itemRes.text()
    throw new Error(`ML items/${itemId} (${itemRes.status}): ${txt}`)
  }

  const item = await itemRes.json()
  const desc = descRes.ok ? await descRes.json() : { plain_text: '' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attrs = (item.attributes ?? []) as any[]

  return {
    title:              item.title ?? '',
    description:        desc.plain_text || desc.text || null,
    price:              item.price ?? null,
    original_price:     item.original_price ?? null,
    images:             (item.pictures ?? []).map((p: Record<string, string>) => p.secure_url || p.url).filter(Boolean),
    category:           item.category_id ?? null,
    brand:              attrs.find((a: Record<string, string>) => a.id === 'BRAND')?.value_name ?? null,
    condition:          item.condition ?? 'new',
    attributes:         attrs.reduce((acc: Record<string, string>, a: Record<string, string>) => {
      if (a.value_name) acc[a.name || a.id] = a.value_name
      return acc
    }, {} as Record<string, string>),
    sku:                item.seller_custom_field ?? null,
    ean:                attrs.find((a: Record<string, string>) => a.id === 'GTIN')?.value_name ?? null,
    source_id:          itemId,
    source_marketplace: 'ml',
  }
}

/* ─── Magalu: extrair dados completos de um SKU ────────────────────────────── */

async function extractFromMagalu(
  skuId: string,
  accessToken: string,
  sellerId: string,
): Promise<ExtractedData> {
  const path = MAGALU_PATH_SKUS + `/${encodeURIComponent(skuId)}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await magaluGet(path, accessToken, sellerId) as any

  return {
    title:              raw.title ?? raw.name ?? raw.product_title ?? '',
    description:        raw.description ?? null,
    price:              raw.price?.list_price ?? raw.price?.sell_price ?? raw.sale_price ?? raw.price ?? null,
    original_price:     raw.price?.list_price ?? raw.original_price ?? null,
    images:             (raw.images ?? []).map((img: Record<string, string>) => img.url ?? img.secure_url).filter(Boolean),
    category:           raw.category ?? raw.subcategory ?? null,
    brand:              raw.brand ?? null,
    condition:          raw.condition ?? 'new',
    attributes:         raw.attributes ?? {},
    sku:                String(raw.sku ?? raw.sku_id ?? raw.id ?? raw.code ?? ''),
    ean:                raw.ean ?? raw.gtin ?? null,
    source_id:          skuId,
    source_marketplace: 'magalu',
  }
}

/* ─── Checar se SKU já existe no destino ───────────────────────────────────── */

async function skuExistsInML(
  sku: string,
  mlUserId: number,
  token: string,
): Promise<boolean> {
  try {
    const url = `${ML_API_BASE}/users/${mlUserId}/items/search?seller_sku=${encodeURIComponent(sku)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return false
    const data = await res.json()
    return (data.results ?? []).length > 0
  } catch {
    return false
  }
}

async function skuExistsInMagalu(
  sku: string,
  accessToken: string,
  sellerId: string,
): Promise<boolean> {
  try {
    const path = MAGALU_PATH_SKUS + `/${encodeURIComponent(sku)}`
    await magaluGet(path, accessToken, sellerId)
    return true
  } catch {
    return false
  }
}

/* ─── Concurrency limiter ──────────────────────────────────────────────────── */

async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
): Promise<T[]> {
  const results: T[] = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const currentIndex = index++
      results[currentIndex] = await tasks[currentIndex]()
    }
  }

  const workers = Array.from({ length: Math.min(maxConcurrent, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/* ─── Handler POST ─────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:edit')
  if (authError) return authError

  let body: {
    product_ids?: string[]
    source_channel?: string
    dest_channel?: string
    duplicate_mode?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { product_ids, source_channel, dest_channel, duplicate_mode = 'ignore' } = body

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: 'Lista de product_ids é obrigatória' }, { status: 400 })
  }

  if (!source_channel || !['ml', 'magalu'].includes(source_channel)) {
    return NextResponse.json({ error: 'Canal de origem inválido. Use: ml ou magalu' }, { status: 400 })
  }

  if (!dest_channel || !['ml', 'magalu'].includes(dest_channel)) {
    return NextResponse.json({ error: 'Canal de destino inválido. Use: ml ou magalu' }, { status: 400 })
  }

  if (source_channel === dest_channel) {
    return NextResponse.json({ error: 'Canal de origem e destino devem ser diferentes' }, { status: 400 })
  }

  if (product_ids.length > 50) {
    return NextResponse.json({ error: 'Máximo de 50 produtos por migração' }, { status: 400 })
  }

  try {
    // Preparar conexões
    let mlToken: string | null = null
    let mlUserId: number | null = null
    let magaluAccessToken: string | null = null
    let magaluSellerId: string | null = null

    if (source_channel === 'ml' || dest_channel === 'ml') {
      const conn = await getMLConnection(dataOwnerId)
      if (!conn?.connected) throw new Error('ML não conectado')
      mlToken = await getValidToken(dataOwnerId)
      if (!mlToken) throw new Error('Token ML inválido — reconecte sua conta')
      mlUserId = conn.ml_user_id
    }

    if (source_channel === 'magalu' || dest_channel === 'magalu') {
      const tokenData = await getValidMagaluToken(dataOwnerId)
      if (!tokenData) throw new Error('Magalu não conectado')
      magaluAccessToken = tokenData.accessToken
      magaluSellerId = tokenData.sellerId
    }

    let success = 0
    let skipped = 0
    let failed = 0
    const errors: { id: string; error: string }[] = []

    const db = supabaseAdmin()

    // Processar com limite de concorrência
    const tasks = product_ids.map((productId) => async () => {
      try {
        // 1. Extrair dados do canal de origem
        let extracted: ExtractedData

        if (source_channel === 'ml') {
          extracted = await extractFromML(productId, mlToken!)
        } else {
          extracted = await extractFromMagalu(productId, magaluAccessToken!, magaluSellerId!)
        }

        // 2. Checar duplicatas no destino (se modo = ignore)
        if (duplicate_mode === 'ignore' && extracted.sku) {
          let exists = false
          if (dest_channel === 'ml') {
            exists = await skuExistsInML(extracted.sku, mlUserId!, mlToken!)
          } else {
            exists = await skuExistsInMagalu(extracted.sku, magaluAccessToken!, magaluSellerId!)
          }

          if (exists) {
            skipped++
            return
          }
        }

        // 3. Criar draft_listing no Supabase
        const draft = {
          user_id:            dataOwnerId,
          source_url:         null,
          source_marketplace: extracted.source_marketplace,
          source_id:          extracted.source_id,
          title:              extracted.title,
          description:        extracted.description,
          price:              extracted.price,
          original_price:     extracted.original_price,
          currency:           'BRL',
          images:             extracted.images,
          category:           extracted.category,
          brand:              extracted.brand,
          condition:          extracted.condition,
          attributes:         extracted.attributes,
          sku:                extracted.sku,
          ean:                extracted.ean,
          weight:             null,
          dimensions:         null,
          target_channels:    [dest_channel],
          status:             'draft',
          created_by:         'migration',
        }

        const { error: insertError } = await db
          .from('draft_listings')
          .insert(draft)

        if (insertError) {
          throw new Error(insertError.message)
        }

        success++
      } catch (err: unknown) {
        failed++
        const msg = err instanceof Error ? err.message : String(err)
        errors.push({ id: productId, error: msg })
      }
    })

    await withConcurrencyLimit(tasks, 10)

    return NextResponse.json({ success, skipped, failed, errors })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Migrate execute POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
