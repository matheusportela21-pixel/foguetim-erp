/**
 * PATCH  /api/armazem/mapeamentos/[id]  — update sync toggles (auto_sync_stock, auto_sync_price)
 * DELETE /api/armazem/mapeamentos/[id]  — remove a mapping
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const { id } = params
    const body = await req.json()

    // Allow only safe fields to be patched
    const allowed = ['auto_sync_stock', 'auto_sync_price', 'mapping_status', 'listing_title', 'listing_sku']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    // Verify ownership
    const { data: existing, error: fetchErr } = await db
      .from('warehouse_product_mappings')
      .select('id')
      .eq('id', id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (fetchErr) {
      console.error('[armazem/mapeamentos PATCH fetch]', fetchErr)
      return NextResponse.json({ error: 'Erro ao verificar mapeamento' }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: 'Mapeamento não encontrado' }, { status: 404 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateErr } = await db
      .from('warehouse_product_mappings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', dataOwnerId)
      .select()
      .single()

    if (updateErr) {
      console.error('[armazem/mapeamentos PATCH update]', updateErr)
      return NextResponse.json({ error: 'Erro ao atualizar mapeamento' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/mapeamentos PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const { id } = params

    // Verify mapping exists and belongs to user
    const { data: mapping, error: fetchError } = await db
      .from('warehouse_product_mappings')
      .select('id, warehouse_product_id')
      .eq('id', id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (fetchError) {
      console.error('[armazem/mapeamentos DELETE fetch]', fetchError)
      return NextResponse.json({ error: 'Erro ao verificar mapeamento' }, { status: 500 })
    }
    if (!mapping) {
      return NextResponse.json({ error: 'Mapeamento não encontrado' }, { status: 404 })
    }

    const { warehouse_product_id } = mapping

    // Delete the mapping
    const { error: deleteError } = await db
      .from('warehouse_product_mappings')
      .delete()
      .eq('id', id)
      .eq('user_id', dataOwnerId)

    if (deleteError) {
      console.error('[armazem/mapeamentos DELETE delete]', deleteError)
      return NextResponse.json({ error: 'Erro ao remover mapeamento' }, { status: 500 })
    }

    // Check if any remaining mappings exist for this product
    const { count, error: countError } = await db
      .from('warehouse_product_mappings')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_product_id', warehouse_product_id)
      .eq('user_id', dataOwnerId)

    if (!countError && (count ?? 0) === 0) {
      // No more mappings — update completion_status.mapping = false
      const { data: prod } = await db
        .from('warehouse_products')
        .select('completion_status')
        .eq('id', warehouse_product_id)
        .single()

      const newStatus = {
        ...((prod?.completion_status as Record<string, boolean>) || {}),
        mapping: false,
      }
      await db
        .from('warehouse_products')
        .update({ completion_status: newStatus })
        .eq('id', warehouse_product_id)
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/mapeamentos DELETE]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
