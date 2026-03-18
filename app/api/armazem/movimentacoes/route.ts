/**
 * POST /api/armazem/movimentacoes  — create a stock movement and update inventory
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

type MovementType =
  | 'entrada_manual'
  | 'saida_manual'
  | 'venda'
  | 'cancelamento'
  | 'ajuste'
  | 'transferencia_entrada'
  | 'transferencia_saida'
  | 'recebimento_nf'
  | 'devolucao'
  | 'kit_baixa'

const MOVEMENT_TYPES: MovementType[] = [
  'entrada_manual',
  'saida_manual',
  'venda',
  'cancelamento',
  'ajuste',
  'transferencia_entrada',
  'transferencia_saida',
  'recebimento_nf',
  'devolucao',
  'kit_baixa',
]

// Movement types that increase available_qty
const INCREASE_TYPES: MovementType[] = [
  'entrada_manual',
  'recebimento_nf',
  'devolucao',
  'cancelamento',
  'transferencia_entrada',
]

// Movement types that decrease available_qty
const DECREASE_TYPES: MovementType[] = [
  'saida_manual',
  'venda',
  'kit_baixa',
  'transferencia_saida',
]

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const {
      warehouse_id,
      product_id,
      location_id,
      movement_type,
      quantity,
      reason,
      reference_type,
      reference_id,
      metadata,
    } = body

    // Validate required fields
    if (!warehouse_id || !product_id || !movement_type || quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: warehouse_id, product_id, movement_type, quantity' },
        { status: 400 },
      )
    }

    if (!MOVEMENT_TYPES.includes(movement_type as MovementType)) {
      return NextResponse.json(
        { error: `movement_type inválido. Valores aceitos: ${MOVEMENT_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    const qty = Number(quantity)
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ error: 'quantity deve ser um número positivo' }, { status: 400 })
    }

    // Validate user owns the warehouse
    const { data: warehouse, error: whError } = await db
      .from('warehouses')
      .select('id')
      .eq('id', warehouse_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (whError) {
      console.error('[armazem/movimentacoes POST warehouse]', whError)
      return NextResponse.json({ error: 'Erro ao verificar armazém' }, { status: 500 })
    }
    if (!warehouse) {
      return NextResponse.json({ error: 'Armazém não encontrado' }, { status: 404 })
    }

    // Validate user owns the product
    const { data: product, error: prodError } = await db
      .from('warehouse_products')
      .select('id')
      .eq('id', product_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (prodError) {
      console.error('[armazem/movimentacoes POST product]', prodError)
      return NextResponse.json({ error: 'Erro ao verificar produto' }, { status: 500 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Get current inventory record
    const { data: inventoryRecord, error: invError } = await db
      .from('warehouse_inventory')
      .select('id, available_qty, reserved_qty, in_transit_qty')
      .eq('warehouse_id', warehouse_id)
      .eq('product_id', product_id)
      .maybeSingle()

    if (invError) {
      console.error('[armazem/movimentacoes POST inventory fetch]', invError)
      return NextResponse.json({ error: 'Erro ao buscar inventário' }, { status: 500 })
    }

    let inventory = inventoryRecord

    // Create inventory record if it doesn't exist
    if (!inventory) {
      const initData: Record<string, unknown> = {
        warehouse_id,
        product_id,
        available_qty:  0,
        reserved_qty:   0,
        in_transit_qty: 0,
      }
      if (location_id) initData.location_id = location_id

      const { data: newInv, error: createInvError } = await db
        .from('warehouse_inventory')
        .insert(initData)
        .select('id, available_qty, reserved_qty, in_transit_qty')
        .single()

      if (createInvError) {
        console.error('[armazem/movimentacoes POST inventory create]', createInvError)
        return NextResponse.json({ error: 'Erro ao inicializar inventário' }, { status: 500 })
      }

      inventory = newInv
    }

    const currentAvailable = Number(inventory.available_qty ?? 0)
    let newAvailable: number
    let quantityChange: number

    if (INCREASE_TYPES.includes(movement_type as MovementType)) {
      newAvailable   = currentAvailable + qty
      quantityChange = qty
    } else if (DECREASE_TYPES.includes(movement_type as MovementType)) {
      newAvailable   = Math.max(0, currentAvailable - qty)
      quantityChange = -(currentAvailable - newAvailable) // actual change (may differ if floor at 0)
    } else if (movement_type === 'ajuste') {
      // Absolute set
      newAvailable   = qty
      quantityChange = qty - currentAvailable
    } else {
      // Fallback (shouldn't happen due to validation above)
      newAvailable   = currentAvailable
      quantityChange = 0
    }

    // Update inventory
    const { error: updateInvError } = await db
      .from('warehouse_inventory')
      .update({ available_qty: newAvailable })
      .eq('id', inventory.id)

    if (updateInvError) {
      console.error('[armazem/movimentacoes POST inventory update]', updateInvError)
      return NextResponse.json({ error: 'Erro ao atualizar inventário' }, { status: 500 })
    }

    // Insert movement record
    const movementData: Record<string, unknown> = {
      warehouse_id,
      product_id,
      movement_type,
      quantity_before: currentAvailable,
      quantity_change: quantityChange,
      quantity_after:  newAvailable,
      created_by:      user.id,
    }

    if (location_id     !== undefined) movementData.location_id    = location_id
    if (reason          !== undefined) movementData.reason          = reason
    if (reference_type  !== undefined) movementData.reference_type  = reference_type
    if (reference_id    !== undefined) movementData.reference_id    = reference_id
    if (metadata        !== undefined) movementData.metadata        = metadata

    const { data: movement, error: movError } = await db
      .from('warehouse_stock_movements')
      .insert(movementData)
      .select()
      .single()

    if (movError) {
      console.error('[armazem/movimentacoes POST movement insert]', movError)
      // Inventory was already updated — log this inconsistency but return an error
      return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
    }

    // Fetch updated inventory to return
    const { data: updatedInventory } = await db
      .from('warehouse_inventory')
      .select('*')
      .eq('id', inventory.id)
      .single()

    return NextResponse.json({ movement, inventory: updatedInventory }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/movimentacoes POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
