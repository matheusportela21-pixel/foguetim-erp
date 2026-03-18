/**
 * PATCH /api/armazem/notas-entrada/[id]/items/[itemId]
 * Resolve an invoice item: map to existing product OR create new
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    // Admin check
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: invoiceId, itemId } = params

    // Verify invoice belongs to user
    const { data: invoice, error: invoiceError } = await db
      .from('purchase_invoices_beta')
      .select('id, status')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (invoiceError) {
      console.error('[notas-entrada/items PATCH invoice]', invoiceError)
      return NextResponse.json({ error: 'Erro ao verificar nota fiscal' }, { status: 500 })
    }
    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }

    if (invoice.status === 'completed') {
      return NextResponse.json({ error: 'Nota já confirmada, não é possível alterar itens' }, { status: 400 })
    }

    // Fetch the item
    const { data: item, error: itemFetchError } = await db
      .from('purchase_invoice_items_beta')
      .select('*')
      .eq('id', itemId)
      .eq('invoice_id', invoiceId)
      .maybeSingle()

    if (itemFetchError) {
      console.error('[notas-entrada/items PATCH item fetch]', itemFetchError)
      return NextResponse.json({ error: 'Erro ao buscar item' }, { status: 500 })
    }
    if (!item) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const { resolution_type, mapped_product_id, product_data } = body

    if (!resolution_type || !['mapped', 'create_new', 'pending'].includes(resolution_type)) {
      return NextResponse.json(
        { error: 'resolution_type inválido. Valores aceitos: mapped, create_new, pending' },
        { status: 400 },
      )
    }

    let updatePayload: Record<string, unknown> = { resolution_type }

    if (resolution_type === 'pending') {
      updatePayload.mapped_product_id = null
    } else if (resolution_type === 'mapped') {
      if (!mapped_product_id) {
        return NextResponse.json({ error: 'mapped_product_id é obrigatório para resolution_type "mapped"' }, { status: 400 })
      }

      // Verify product belongs to user
      const { data: existingProduct, error: epError } = await db
        .from('warehouse_products')
        .select('id')
        .eq('id', mapped_product_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (epError) {
        console.error('[notas-entrada/items PATCH existing product]', epError)
        return NextResponse.json({ error: 'Erro ao verificar produto' }, { status: 500 })
      }
      if (!existingProduct) {
        return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
      }

      updatePayload.mapped_product_id = mapped_product_id
    } else if (resolution_type === 'create_new') {
      if (!product_data?.name || !product_data?.sku) {
        return NextResponse.json(
          { error: 'product_data.name e product_data.sku são obrigatórios para resolution_type "create_new"' },
          { status: 400 },
        )
      }

      // Create new warehouse_product
      const newProductData: Record<string, unknown> = {
        user_id: user.id,
        name: product_data.name,
        sku: product_data.sku,
        cost_price:
          product_data.cost_price !== undefined
            ? product_data.cost_price
            : Number(item.unit_cost ?? 0),
        source_type: 'nfe',
        completion_status: { basic_info: true, pricing: false, mapping: false },
      }

      if (product_data.barcode !== undefined) {
        newProductData.barcode = product_data.barcode
      } else if (item.barcode) {
        newProductData.barcode = item.barcode
      }

      if (product_data.category_id !== undefined) {
        newProductData.category_id = product_data.category_id
      }

      const { data: newProduct, error: createProdError } = await db
        .from('warehouse_products')
        .insert(newProductData)
        .select('id')
        .single()

      if (createProdError) {
        console.error('[notas-entrada/items PATCH create_new product]', createProdError)
        return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
      }

      updatePayload.mapped_product_id = newProduct.id
    }

    // Update the item
    const { data: updatedItem, error: updateError } = await db
      .from('purchase_invoice_items_beta')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('invoice_id', invoiceId)
      .select('*, product:warehouse_products!mapped_product_id(id, sku, name)')
      .single()

    if (updateError) {
      console.error('[notas-entrada/items PATCH update]', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
    }

    return NextResponse.json(updatedItem)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notas-entrada/items PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
