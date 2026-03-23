/**
 * POST /api/armazem/movimentacoes/transferencia
 * Creates TWO stock movements atomically: transferencia_saida + transferencia_entrada
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface InventoryRecord {
  id: number
  available_qty: number
  reserved_qty: number
  in_transit_qty: number
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const { product_id, from_warehouse_id, to_warehouse_id, quantity, reason } = body

    // Validation
    if (!product_id || !from_warehouse_id || !to_warehouse_id || quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: product_id, from_warehouse_id, to_warehouse_id, quantity' },
        { status: 400 },
      )
    }

    if (from_warehouse_id === to_warehouse_id) {
      return NextResponse.json(
        { error: 'from_warehouse_id e to_warehouse_id não podem ser iguais' },
        { status: 400 },
      )
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity deve ser um número positivo maior que zero' }, { status: 400 })
    }

    // Verify user owns both warehouses
    const { data: fromWarehouse, error: fromWhError } = await db
      .from('warehouses')
      .select('id')
      .eq('id', from_warehouse_id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (fromWhError) {
      console.error('[transferencia POST from_warehouse]', fromWhError)
      return NextResponse.json({ error: 'Erro ao verificar armazém de origem' }, { status: 500 })
    }
    if (!fromWarehouse) {
      return NextResponse.json({ error: 'Armazém de origem não encontrado' }, { status: 404 })
    }

    const { data: toWarehouse, error: toWhError } = await db
      .from('warehouses')
      .select('id')
      .eq('id', to_warehouse_id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (toWhError) {
      console.error('[transferencia POST to_warehouse]', toWhError)
      return NextResponse.json({ error: 'Erro ao verificar armazém de destino' }, { status: 500 })
    }
    if (!toWarehouse) {
      return NextResponse.json({ error: 'Armazém de destino não encontrado' }, { status: 404 })
    }

    // Verify user owns the product
    const { data: product, error: prodError } = await db
      .from('warehouse_products')
      .select('id')
      .eq('id', product_id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (prodError) {
      console.error('[transferencia POST product]', prodError)
      return NextResponse.json({ error: 'Erro ao verificar produto' }, { status: 500 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Step 1: Get inventory in source warehouse
    const { data: sourceInvRecord, error: srcInvError } = await db
      .from('warehouse_inventory')
      .select('id, available_qty, reserved_qty, in_transit_qty')
      .eq('warehouse_id', from_warehouse_id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (srcInvError) {
      console.error('[transferencia POST source inventory]', srcInvError)
      return NextResponse.json({ error: 'Erro ao buscar inventário de origem' }, { status: 500 })
    }

    const sourceAvailable = Number(sourceInvRecord?.available_qty ?? 0)

    if (sourceAvailable < qty) {
      return NextResponse.json(
        { error: `Estoque insuficiente. Disponível: ${sourceAvailable}, solicitado: ${qty}` },
        { status: 400 },
      )
    }

    // Step 2: Compute source after saida
    const newSourceAvailable = Math.max(0, sourceAvailable - qty)
    const saidaChange = -(sourceAvailable - newSourceAvailable)

    // Ensure source inventory record exists
    let sourceInv: InventoryRecord
    if (!sourceInvRecord) {
      const { data: newSrcInv, error: createSrcErr } = await db
        .from('warehouse_inventory')
        .insert({
          warehouse_id: from_warehouse_id,
          product_id,
          available_qty: 0,
          reserved_qty: 0,
          in_transit_qty: 0,
        })
        .select('id, available_qty, reserved_qty, in_transit_qty')
        .single()

      if (createSrcErr || !newSrcInv) {
        console.error('[transferencia POST create source inventory]', createSrcErr)
        return NextResponse.json({ error: 'Erro ao inicializar inventário de origem' }, { status: 500 })
      }
      sourceInv = newSrcInv as InventoryRecord
    } else {
      sourceInv = sourceInvRecord as InventoryRecord
    }

    // Step 3: Insert transferencia_saida movement
    const saidaData: Record<string, unknown> = {
      warehouse_id: from_warehouse_id,
      product_id,
      movement_type: 'transferencia_saida',
      quantity_before: sourceAvailable,
      quantity_change: saidaChange,
      quantity_after: newSourceAvailable,
      created_by: dataOwnerId,
      reference_type: 'transfer',
      reference_id: String(to_warehouse_id),
    }
    if (reason !== undefined) saidaData.reason = reason

    const { data: saidaMovement, error: saidaError } = await db
      .from('warehouse_stock_movements')
      .insert(saidaData)
      .select()
      .single()

    if (saidaError) {
      console.error('[transferencia POST saida movement]', saidaError)
      return NextResponse.json({ error: 'Erro ao registrar saída de transferência' }, { status: 500 })
    }

    // Step 4: Update inventory in source warehouse
    const { error: updateSrcError } = await db
      .from('warehouse_inventory')
      .update({ available_qty: newSourceAvailable })
      .eq('id', sourceInv.id)

    if (updateSrcError) {
      console.error('[transferencia POST update source inventory]', updateSrcError)
      // Saida was already inserted — log inconsistency
      return NextResponse.json({ error: 'Erro ao atualizar inventário de origem (inconsistência parcial)' }, { status: 500 })
    }

    // Step 5: Get or create inventory in destination warehouse
    const { data: destInvRecord, error: destInvError } = await db
      .from('warehouse_inventory')
      .select('id, available_qty, reserved_qty, in_transit_qty')
      .eq('warehouse_id', to_warehouse_id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (destInvError) {
      console.error('[transferencia POST dest inventory]', destInvError)
      return NextResponse.json({ error: 'Erro ao buscar inventário de destino (inconsistência parcial)' }, { status: 500 })
    }

    let destInv: InventoryRecord
    if (!destInvRecord) {
      const { data: newDestInv, error: createDestErr } = await db
        .from('warehouse_inventory')
        .insert({
          warehouse_id: to_warehouse_id,
          product_id,
          available_qty: 0,
          reserved_qty: 0,
          in_transit_qty: 0,
        })
        .select('id, available_qty, reserved_qty, in_transit_qty')
        .single()

      if (createDestErr || !newDestInv) {
        console.error('[transferencia POST create dest inventory]', createDestErr)
        return NextResponse.json({ error: 'Erro ao inicializar inventário de destino (inconsistência parcial)' }, { status: 500 })
      }
      destInv = newDestInv as InventoryRecord
    } else {
      destInv = destInvRecord as InventoryRecord
    }

    // Step 6: Compute destination after entrada
    const destAvailable = Number(destInv.available_qty ?? 0)
    const newDestAvailable = destAvailable + qty

    // Step 7: Insert transferencia_entrada movement
    const entradaData: Record<string, unknown> = {
      warehouse_id: to_warehouse_id,
      product_id,
      movement_type: 'transferencia_entrada',
      quantity_before: destAvailable,
      quantity_change: qty,
      quantity_after: newDestAvailable,
      created_by: dataOwnerId,
      reference_type: 'transfer',
      reference_id: String(from_warehouse_id),
    }
    if (reason !== undefined) entradaData.reason = reason

    const { data: entradaMovement, error: entradaError } = await db
      .from('warehouse_stock_movements')
      .insert(entradaData)
      .select()
      .single()

    if (entradaError) {
      console.error('[transferencia POST entrada movement]', entradaError)
      return NextResponse.json({ error: 'Erro ao registrar entrada de transferência (inconsistência parcial)' }, { status: 500 })
    }

    // Step 8: Update inventory in destination warehouse
    const { error: updateDestError } = await db
      .from('warehouse_inventory')
      .update({ available_qty: newDestAvailable })
      .eq('id', destInv.id)

    if (updateDestError) {
      console.error('[transferencia POST update dest inventory]', updateDestError)
      return NextResponse.json({ error: 'Erro ao atualizar inventário de destino (inconsistência parcial)' }, { status: 500 })
    }

    return NextResponse.json({ saida: saidaMovement, entrada: entradaMovement }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/movimentacoes/transferencia POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
