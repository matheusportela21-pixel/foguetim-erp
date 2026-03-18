/**
 * GET    /api/armazem/produtos/[id]  — fetch one product with full details
 * PATCH  /api/armazem/produtos/[id]  — partial update
 * DELETE /api/armazem/produtos/[id]  — hard delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const { data: product, error } = await db
      .from('warehouse_products')
      .select(
        `*,
         category:warehouse_categories(id, name, slug),
         inventory:warehouse_inventory(*, warehouse:warehouses(id, name, code), location:warehouse_locations(id, label)),
         mappings:warehouse_product_mappings(*),
         variations:warehouse_products!parent_id(id, sku, name, barcode, cost_price, active, completion_status),
         kit_items:warehouse_product_kit_items(id, quantity, component:warehouse_products!component_product_id(id, sku, name, cost_price))`,
      )
      .eq('id', params.id)
      .single()

    if (error || !product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    if ((product as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: product })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/produtos/[id] GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    // Guard: check ownership
    const { data: existing, error: findError } = await db
      .from('warehouse_products')
      .select('id, user_id, name, sku, cost_price, ncm, weight_g')
      .eq('id', params.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }
    if ((existing as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const body = await req.json()

    // SKU is readonly — strip it if sent
    delete body.sku
    delete body.user_id
    delete body.id
    delete body.created_at
    delete body.source_type

    // Allowed updatable fields
    const ALLOWED = [
      'name', 'nickname', 'brand', 'barcode', 'has_no_ean', 'description',
      'category_id', 'active', 'cost_price', 'reference_price', 'ncm', 'cest',
      'origin', 'unit', 'weight_g', 'length_cm', 'width_cm', 'height_cm',
      'product_type', 'parent_id',
    ]

    const updates: Record<string, unknown> = {}
    for (const key of ALLOWED) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    // Merge with existing to compute completion
    const merged = { ...existing, ...updates } as Record<string, unknown>
    updates.completion_status = computeCompletion(merged)
    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await db
      .from('warehouse_products')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[armazem/produtos/[id] PATCH]', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/produtos/[id] PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    // Guard: check ownership
    const { data: existing, error: findError } = await db
      .from('warehouse_products')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }
    if ((existing as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    const { error: deleteError } = await db
      .from('warehouse_products')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[armazem/produtos/[id] DELETE]', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/produtos/[id] DELETE]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
