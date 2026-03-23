/**
 * GET  /api/armazem/movimentacoes  — list stock movements
 * POST /api/armazem/movimentacoes  — create a stock movement and update inventory
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
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

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('inventory:view')
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const { searchParams } = new URL(req.url)
    const product_id = searchParams.get('product_id') || ''
    const warehouse_id = searchParams.get('warehouse_id') || ''
    const typeParam = searchParams.get('type') || ''
    const date_from = searchParams.get('date_from') || ''
    const date_to = searchParams.get('date_to') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Get user's warehouse IDs for isolation
    const { data: userWarehouses, error: whError } = await db
      .from('warehouses')
      .select('id')
      .eq('user_id', dataOwnerId)

    if (whError) {
      console.error('[armazem/movimentacoes GET warehouses]', whError)
      return NextResponse.json({ error: 'Erro ao verificar armazéns' }, { status: 500 })
    }

    const warehouseIds = (userWarehouses ?? []).map((w: { id: number }) => w.id)
    if (warehouseIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit })
    }

    let query = db
      .from('warehouse_stock_movements')
      .select(
        `id, warehouse_id, product_id, movement_type, quantity_before, quantity_change, quantity_after,
         reason, reference_type, reference_id, created_by, created_at,
         product:warehouse_products!product_id(id, sku, name),
         warehouse:warehouses!warehouse_id(id, name)`,
        { count: 'exact' },
      )
      .in('warehouse_id', warehouseIds)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (warehouse_id) {
      query = query.eq('warehouse_id', warehouse_id)
    }
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    if (typeParam) {
      const typeArr = typeParam.split(',').map((t) => t.trim()).filter(Boolean)
      if (typeArr.length > 0) {
        query = query.in('movement_type', typeArr)
      }
    }
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    if (date_to) {
      const dateTo = date_to.endsWith('Z') ? date_to : `${date_to}T23:59:59-03:00`
      query = query.lte('created_at', dateTo)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[armazem/movimentacoes GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar movimentações' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/movimentacoes GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { userId, dataOwnerId, error: authError } = await requirePermission('inventory:manage')
  if (authError) return authError
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
      unit_cost,
    } = body

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

    const { data: warehouse, error: whError } = await db
      .from('warehouses')
      .select('id')
      .eq('id', warehouse_id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (whError) {
      console.error('[armazem/movimentacoes POST warehouse]', whError)
      return NextResponse.json({ error: 'Erro ao verificar armazém' }, { status: 500 })
    }
    if (!warehouse) {
      return NextResponse.json({ error: 'Armazém não encontrado' }, { status: 404 })
    }

    const { data: product, error: prodError } = await db
      .from('warehouse_products')
      .select('id')
      .eq('id', product_id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (prodError) {
      console.error('[armazem/movimentacoes POST product]', prodError)
      return NextResponse.json({ error: 'Erro ao verificar produto' }, { status: 500 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

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
      quantityChange = -(currentAvailable - newAvailable)
    } else if (movement_type === 'ajuste') {
      newAvailable   = qty
      quantityChange = qty - currentAvailable
    } else {
      newAvailable   = currentAvailable
      quantityChange = 0
    }

    const { error: updateInvError } = await db
      .from('warehouse_inventory')
      .update({ available_qty: newAvailable })
      .eq('id', inventory.id)

    if (updateInvError) {
      console.error('[armazem/movimentacoes POST inventory update]', updateInvError)
      return NextResponse.json({ error: 'Erro ao atualizar inventário' }, { status: 500 })
    }

    // Atualizar last_entry_cost e average_cost se custo informado
    const unitCostNum = unit_cost !== undefined && unit_cost !== null ? Number(unit_cost) : 0
    if (unitCostNum > 0 && INCREASE_TYPES.includes(movement_type as MovementType)) {
      try {
        const { data: prodCost } = await db
          .from('warehouse_products')
          .select('average_cost')
          .eq('id', product_id)
          .eq('user_id', dataOwnerId)
          .maybeSingle()

        const currentAvg = Number((prodCost as { average_cost?: number | null } | null)?.average_cost ?? 0) || unitCostNum
        const newAvg = currentAvailable > 0
          ? (currentAvg * currentAvailable + unitCostNum * qty) / (currentAvailable + qty)
          : unitCostNum

        await db
          .from('warehouse_products')
          .update({
            last_entry_cost: Math.round(unitCostNum * 100) / 100,
            average_cost:    Math.round(newAvg * 100) / 100,
          })
          .eq('id', product_id)
          .eq('user_id', dataOwnerId)
      } catch (costErr) {
        console.error('[movimentacoes POST cost update]', costErr)
        // non-critical — don't fail the whole request
      }
    }

    const movementData: Record<string, unknown> = {
      warehouse_id,
      product_id,
      movement_type,
      quantity_before: currentAvailable,
      quantity_change: quantityChange,
      quantity_after:  newAvailable,
      created_by:      userId,
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
      return NextResponse.json({ error: 'Erro ao registrar movimentação' }, { status: 500 })
    }

    const { data: updatedInventory } = await db
      .from('warehouse_inventory')
      .select('*')
      .eq('id', inventory.id)
      .single()

    // ── Fire-and-forget: sincronizar estoque com marketplace se produto tem opt-in ──
    // REGRA: só executa se o produto tiver mapeamentos com auto_sync_stock = true.
    // A sincronização é assíncrona — não bloqueia a resposta da movimentação.
    // O armazém é a fonte de verdade; a sync com ML é consequência.
    if (INCREASE_TYPES.includes(movement_type as MovementType) ||
        DECREASE_TYPES.includes(movement_type as MovementType) ||
        movement_type === 'ajuste') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      // Não aguardar — fire-and-forget
      void fetch(`${baseUrl}/api/armazem/sync-to-marketplace`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ product_id, fields: ['stock'] }),
      }).catch(err => {
        console.error('[movimentacoes] Sync fire-and-forget falhou (não crítico):', err)
      })
    }

    return NextResponse.json({ movement, inventory: updatedInventory }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/movimentacoes POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
