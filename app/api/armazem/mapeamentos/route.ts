/**
 * GET  /api/armazem/mapeamentos  — list product-to-listing mappings
 * POST /api/armazem/mapeamentos  — create a new mapping
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const channel = searchParams.get('channel') || ''
    const status = searchParams.get('status') || ''
    const product_id = searchParams.get('product_id') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = db
      .from('warehouse_product_mappings')
      .select(
        `id, warehouse_product_id, channel, marketplace_item_id, listing_title, listing_sku, listing_status, mapping_status, created_at, updated_at,
         product:warehouse_products!warehouse_product_id(id, sku, name, barcode)`,
        { count: 'exact' },
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (q) {
      query = query.or(`listing_title.ilike.%${q}%,listing_sku.ilike.%${q}%,marketplace_item_id.ilike.%${q}%`)
    }
    if (channel) {
      query = query.eq('channel', channel)
    }
    if (status) {
      query = query.eq('mapping_status', status)
    }
    if (product_id) {
      query = query.eq('warehouse_product_id', product_id)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[armazem/mapeamentos GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar mapeamentos' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/mapeamentos GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const {
      warehouse_product_id,
      channel,
      marketplace_item_id,
      listing_title,
      listing_sku,
      listing_status,
      mapping_status = 'mapped',
    } = body

    if (!warehouse_product_id || !channel || !marketplace_item_id) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: warehouse_product_id, channel, marketplace_item_id' },
        { status: 400 },
      )
    }

    // Verify user owns the product
    const { data: prodCheck, error: prodError } = await db
      .from('warehouse_products')
      .select('id')
      .eq('id', warehouse_product_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (prodError) {
      console.error('[armazem/mapeamentos POST product check]', prodError)
      return NextResponse.json({ error: 'Erro ao verificar produto' }, { status: 500 })
    }
    if (!prodCheck) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      warehouse_product_id,
      channel,
      marketplace_item_id,
      mapping_status,
    }
    if (listing_title !== undefined) insertData.listing_title = listing_title
    if (listing_sku !== undefined) insertData.listing_sku = listing_sku
    if (listing_status !== undefined) insertData.listing_status = listing_status

    const { data: mapping, error: insertError } = await db
      .from('warehouse_product_mappings')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[armazem/mapeamentos POST insert]', insertError)
      return NextResponse.json({ error: 'Erro ao criar mapeamento' }, { status: 500 })
    }

    // Update completion_status.mapping = true on the product
    const { data: prod } = await db
      .from('warehouse_products')
      .select('completion_status')
      .eq('id', warehouse_product_id)
      .single()

    const newStatus = {
      ...((prod?.completion_status as Record<string, boolean>) || {}),
      mapping: true,
    }
    await db
      .from('warehouse_products')
      .update({ completion_status: newStatus })
      .eq('id', warehouse_product_id)

    return NextResponse.json(mapping, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/mapeamentos POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
