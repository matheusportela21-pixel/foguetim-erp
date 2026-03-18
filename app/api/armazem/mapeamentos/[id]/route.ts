/**
 * DELETE /api/armazem/mapeamentos/[id]  — remove a mapping
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const { id } = params

    // Verify mapping exists and belongs to user
    const { data: mapping, error: fetchError } = await db
      .from('warehouse_product_mappings')
      .select('id, warehouse_product_id')
      .eq('id', id)
      .eq('user_id', user.id)
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
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[armazem/mapeamentos DELETE delete]', deleteError)
      return NextResponse.json({ error: 'Erro ao remover mapeamento' }, { status: 500 })
    }

    // Check if any remaining mappings exist for this product
    const { count, error: countError } = await db
      .from('warehouse_product_mappings')
      .select('id', { count: 'exact', head: true })
      .eq('warehouse_product_id', warehouse_product_id)
      .eq('user_id', user.id)

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
