/**
 * GET  /api/armazem/produtos  — list warehouse products (top-level only)
 * POST /api/armazem/produtos  — create a new warehouse product
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

function computeCompletion(p: Record<string, unknown>) {
  return {
    basic:     !!(p.name && p.sku),
    pricing:   !!(p.cost_price),
    fiscal:    !!(p.ncm),
    logistics: !!(p.weight_g),
    mapping:   false,
  }
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('inventory:view')
  if (authError) return authError
  const db = supabaseAdmin()

  const sp       = new URL(req.url).searchParams
  const q        = sp.get('q')?.trim()
  const type     = sp.get('type')
  const category = sp.get('category')
  const mapping  = sp.get('mapping')
  const page     = Math.max(1, Number(sp.get('page') ?? 1))
  const limit    = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20)))
  const from     = (page - 1) * limit
  const to       = from + limit - 1

  try {
    let query = db
      .from('warehouse_products')
      .select(
        `id, sku, name, nickname, product_type, brand, barcode, has_no_ean,
         cost_price, reference_price, active, completion_status, source_type,
         created_at, updated_at,
         category:warehouse_categories(id, name),
         inventory:warehouse_inventory(available_qty, reserved_qty, in_transit_qty, total_qty, warehouse_id),
         mappings:warehouse_product_mappings(id, channel, mapping_status, listing_title)`,
        { count: 'exact' },
      )
      .eq('user_id', dataOwnerId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (type)     query = query.eq('product_type', type)
    if (category) query = query.eq('category_id', category)
    if (q)        query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`)

    // mapping filter applied after (post-select filter on joined relation isn't directly supported —
    // do a separate id-based approach if mapping param is provided)
    const { data, error, count } = await query

    if (error) {
      console.error('[armazem/produtos GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    let result = data ?? []

    // Post-filter by mapping status if requested
    if (mapping) {
      result = result.filter((p) => {
        const mappings = (p.mappings as { mapping_status: string }[] | null) ?? []
        return mappings.some((m) => m.mapping_status === mapping)
      })
    }

    return NextResponse.json({ data: result, total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/produtos GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('inventory:manage')
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const {
      name,
      sku,
      product_type = 'single',
      warehouse_id,
      barcode,
      has_no_ean,
      cost_price,
      reference_price,
      category_id,
      nickname,
      brand,
      description,
      ncm,
      cest,
      origin,
      unit,
      weight_g,
      length_cm,
      width_cm,
      height_cm,
      source_type = 'manual',
    } = body

    if (!name || !sku) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, sku' }, { status: 400 })
    }

    // Check SKU uniqueness
    const { data: existing } = await db
      .from('warehouse_products')
      .select('id')
      .eq('user_id', dataOwnerId)
      .eq('sku', sku.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'SKU já cadastrado' }, { status: 409 })
    }

    const productData: Record<string, unknown> = {
      user_id:      dataOwnerId,
      name:         name.trim(),
      sku:          sku.trim(),
      product_type,
      source_type,
    }

    if (barcode      !== undefined) productData.barcode       = barcode
    if (has_no_ean   !== undefined) productData.has_no_ean    = has_no_ean
    if (cost_price   !== undefined) productData.cost_price    = cost_price
    if (reference_price !== undefined) productData.reference_price = reference_price
    if (category_id  !== undefined) productData.category_id   = category_id
    if (nickname     !== undefined) productData.nickname       = nickname
    if (brand        !== undefined) productData.brand          = brand
    if (description  !== undefined) productData.description    = description
    if (ncm          !== undefined) productData.ncm            = ncm
    if (cest         !== undefined) productData.cest           = cest
    if (origin       !== undefined) productData.origin         = origin
    if (unit         !== undefined) productData.unit           = unit
    if (weight_g     !== undefined) productData.weight_g       = weight_g
    if (length_cm    !== undefined) productData.length_cm      = length_cm
    if (width_cm     !== undefined) productData.width_cm       = width_cm
    if (height_cm    !== undefined) productData.height_cm      = height_cm

    productData.completion_status = computeCompletion(productData)

    const { data: product, error: insertError } = await db
      .from('warehouse_products')
      .insert(productData)
      .select()
      .single()

    if (insertError) {
      console.error('[armazem/produtos POST insert]', insertError)
      return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
    }

    // Create initial inventory record if warehouse_id provided
    if (warehouse_id) {
      const { error: invError } = await db.from('warehouse_inventory').insert({
        warehouse_id,
        product_id:    product.id,
        available_qty: 0,
        reserved_qty:  0,
        in_transit_qty: 0,
      })
      if (invError) {
        console.error('[armazem/produtos POST inventory]', invError)
        // Non-fatal — product was created, inventory init failed
      }
    }

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/produtos POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
