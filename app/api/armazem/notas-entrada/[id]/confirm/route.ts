/**
 * POST /api/armazem/notas-entrada/[id]/confirm
 * Confirm stock entry: create recebimento_nf movements for all resolved items
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

interface InventoryRecord {
  id: number
  available_qty: number
  reserved_qty: number
  in_transit_qty: number
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    // Admin check
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', dataOwnerId)
      .maybeSingle()

    if (!profile || !ADMIN_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: invoiceId } = params

    // Step 1: Load invoice (verify ownership, status != 'completed')
    const { data: invoice, error: invoiceError } = await db
      .from('purchase_invoices_beta')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (invoiceError) {
      console.error('[notas-entrada/confirm POST invoice]', invoiceError)
      return NextResponse.json({ error: 'Erro ao buscar nota fiscal' }, { status: 500 })
    }
    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }
    if (invoice.status === 'completed') {
      return NextResponse.json({ error: 'Nota já confirmada' }, { status: 400 })
    }

    // Step 2: Load all items
    const { data: items, error: itemsError } = await db
      .from('purchase_invoice_items_beta')
      .select('*')
      .eq('invoice_id', invoiceId)

    if (itemsError) {
      console.error('[notas-entrada/confirm POST items]', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar itens da nota' }, { status: 500 })
    }

    const allItems = items ?? []

    // Step 3: Check all items have resolution_type != 'pending'
    const pendingItems = allItems.filter(
      (item: Record<string, unknown>) => item.resolution_type === 'pending',
    )
    if (pendingItems.length > 0) {
      return NextResponse.json(
        {
          error: `Existem ${pendingItems.length} item(ns) pendente(s) de resolução. Resolva todos antes de confirmar.`,
          pending_count: pendingItems.length,
        },
        { status: 400 },
      )
    }

    // Step 4: Get user's default warehouse (or first warehouse)
    const { data: warehouses, error: whError } = await db
      .from('warehouses')
      .select('id, is_default')
      .eq('user_id', dataOwnerId)
      .order('is_default', { ascending: false })
      .limit(1)

    if (whError) {
      console.error('[notas-entrada/confirm POST warehouses]', whError)
      return NextResponse.json({ error: 'Erro ao buscar armazém padrão' }, { status: 500 })
    }
    if (!warehouses || warehouses.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum armazém cadastrado. Crie um armazém antes de confirmar a nota.' },
        { status: 400 },
      )
    }

    const defaultWarehouseId = (warehouses[0] as { id: number }).id

    // Step 5: For each item with mapped_product_id and quantity > 0, create recebimento_nf movement
    const movements: unknown[] = []
    let movementsCreated = 0

    for (const rawItem of allItems) {
      const item = rawItem as Record<string, unknown>
      if (!item.mapped_product_id || Number(item.quantity ?? 0) <= 0) continue

      const productId = item.mapped_product_id as number
      const qty = Number(item.quantity)

      // Get/create inventory record
      const { data: invRecord, error: invFetchErr } = await db
        .from('warehouse_inventory')
        .select('id, available_qty, reserved_qty, in_transit_qty')
        .eq('warehouse_id', defaultWarehouseId)
        .eq('product_id', productId)
        .maybeSingle()

      if (invFetchErr) {
        console.error('[notas-entrada/confirm POST inventory fetch]', invFetchErr)
        return NextResponse.json({ error: 'Erro ao buscar inventário' }, { status: 500 })
      }

      let inventory: InventoryRecord

      if (!invRecord) {
        const { data: newInv, error: createInvErr } = await db
          .from('warehouse_inventory')
          .insert({
            warehouse_id: defaultWarehouseId,
            product_id: productId,
            available_qty: 0,
            reserved_qty: 0,
            in_transit_qty: 0,
          })
          .select('id, available_qty, reserved_qty, in_transit_qty')
          .single()

        if (createInvErr || !newInv) {
          console.error('[notas-entrada/confirm POST inventory create]', createInvErr)
          return NextResponse.json({ error: 'Erro ao inicializar inventário' }, { status: 500 })
        }
        inventory = newInv as InventoryRecord
      } else {
        inventory = invRecord as InventoryRecord
      }

      const currentAvailable = Number(inventory.available_qty ?? 0)
      const newAvailable = currentAvailable + qty

      // Update inventory
      const { error: updateInvErr } = await db
        .from('warehouse_inventory')
        .update({ available_qty: newAvailable })
        .eq('id', inventory.id)

      if (updateInvErr) {
        console.error('[notas-entrada/confirm POST inventory update]', updateInvErr)
        return NextResponse.json({ error: 'Erro ao atualizar inventário' }, { status: 500 })
      }

      // Insert movement record
      const { data: movement, error: movErr } = await db
        .from('warehouse_stock_movements')
        .insert({
          warehouse_id: defaultWarehouseId,
          product_id: productId,
          movement_type: 'recebimento_nf',
          quantity_before: currentAvailable,
          quantity_change: qty,
          quantity_after: newAvailable,
          created_by: dataOwnerId,
          reference_type: 'invoice',
          reference_id: String(invoiceId),
          reason: `Recebimento NF ${invoice.invoice_number || invoiceId}`,
        })
        .select()
        .single()

      if (movErr) {
        console.error('[notas-entrada/confirm POST movement insert]', movErr)
        return NextResponse.json({ error: 'Erro ao registrar movimentação (inconsistência parcial)' }, { status: 500 })
      }

      movements.push(movement)
      movementsCreated++

      // Atualizar last_entry_cost e recalcular average_cost no produto
      const itemCost = Number(item.unit_cost ?? 0)
      const applyCosts = invoice.apply_costs_to_products === true

      let effectiveCost = itemCost

      if (applyCosts && itemCost > 0) {
        // Calcular o total de valor de todos os itens para rateio
        const totalItemsValue = allItems.reduce((sum: number, i: Record<string, unknown>) => {
          return sum + Number(i.unit_cost ?? 0) * Number(i.quantity ?? 0)
        }, 0)

        const itemValue = itemCost * qty

        if (totalItemsValue > 0) {
          const ratio = itemValue / totalItemsValue

          const freightRateio    = ratio * Number(invoice.freight_cost       ?? 0)
          const insuranceRateio  = ratio * Number(invoice.insurance_cost     ?? 0)
          const expensesRateio   = ratio * Number(invoice.other_expenses     ?? 0)
          const discountRateio   = ratio * Number(invoice.discount_amount_entry ?? 0)

          // DIFAL: só ratear se difal_type for 'valor' ou 'percentual'
          let difalRateio = 0
          const difalType  = invoice.difal_type  as string | undefined
          const difalValue = Number(invoice.difal_value ?? 0)
          if (difalType === 'value' || difalType === 'valor') {
            difalRateio = ratio * difalValue
          } else if ((difalType === 'percent' || difalType === 'percentual') && difalValue > 0) {
            difalRateio = ratio * (itemValue * difalValue / 100)
          }

          const totalItemCost = itemValue + freightRateio + insuranceRateio + expensesRateio + difalRateio - discountRateio
          effectiveCost = qty > 0 ? totalItemCost / qty : itemCost
        }
      }

      if (effectiveCost > 0) {
        const { data: prodCost } = await db
          .from('warehouse_products')
          .select('average_cost, last_entry_cost')
          .eq('id', productId)
          .maybeSingle()

        const currentAvg = Number((prodCost as Record<string, unknown> | null)?.average_cost ?? 0) || effectiveCost
        const newAvg = currentAvailable > 0
          ? (currentAvg * currentAvailable + effectiveCost * qty) / (currentAvailable + qty)
          : effectiveCost

        await db
          .from('warehouse_products')
          .update({
            last_entry_cost: Math.round(effectiveCost * 100) / 100,
            average_cost:    Math.round(newAvg * 100) / 100,
          })
          .eq('id', productId)
      }

      // Salvar real_unit_cost no item da nota (sempre, para todos os itens mapeados)
      if (item.id) {
        const costToSave = effectiveCost > 0 ? effectiveCost : itemCost
        try {
          await db
            .from('purchase_invoice_items_beta')
            .update({ real_unit_cost: Math.round(costToSave * 100) / 100 })
            .eq('id', item.id as number)
        } catch { /* non-critical */ }
      }
    }

    // Step 6: Update invoice status to 'completed'
    const { data: updatedInvoice, error: updateInvError } = await db
      .from('purchase_invoices_beta')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('user_id', dataOwnerId)
      .select()
      .single()

    if (updateInvError) {
      console.error('[notas-entrada/confirm POST update invoice]', updateInvError)
      return NextResponse.json({ error: 'Movimentações criadas mas erro ao finalizar nota' }, { status: 500 })
    }

    return NextResponse.json(
      { invoice: updatedInvoice, movements_created: movementsCreated },
      { status: 201 },
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notas-entrada/confirm POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
