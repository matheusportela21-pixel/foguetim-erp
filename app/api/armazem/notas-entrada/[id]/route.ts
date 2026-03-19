/**
 * GET  /api/armazem/notas-entrada/[id] — get invoice detail with items
 * PATCH /api/armazem/notas-entrada/[id] — update complementary costs
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
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

    const { id } = params

    // Load invoice
    const { data: invoice, error: invoiceError } = await db
      .from('purchase_invoices_beta')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (invoiceError) {
      console.error('[notas-entrada/[id] GET invoice]', invoiceError)
      return NextResponse.json({ error: 'Erro ao buscar nota fiscal' }, { status: 500 })
    }
    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }

    // Load items with mapped product info
    const { data: items, error: itemsError } = await db
      .from('purchase_invoice_items_beta')
      .select('*, product:warehouse_products!mapped_product_id(id, sku, name)')
      .eq('invoice_id', id)
      .order('id', { ascending: true })

    if (itemsError) {
      console.error('[notas-entrada/[id] GET items]', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar itens da nota' }, { status: 500 })
    }

    return NextResponse.json({ invoice, items: items ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notas-entrada/[id] GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

const COST_FIELDS = [
  'freight_cost',
  'insurance_cost',
  'other_expenses',
  'discount_amount_entry',
  'difal_type',
  'difal_value',
  'apply_costs_to_products',
] as const

type CostField = (typeof COST_FIELDS)[number]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
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

    const { id } = params

    // Verify ownership and status
    const { data: invoice, error: invoiceError } = await db
      .from('purchase_invoices_beta')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (invoiceError) {
      console.error('[notas-entrada/[id] PATCH ownership]', invoiceError)
      return NextResponse.json({ error: 'Erro ao buscar nota fiscal' }, { status: 500 })
    }
    if (!invoice) {
      return NextResponse.json({ error: 'Nota fiscal não encontrada' }, { status: 404 })
    }
    if (invoice.status === 'completed') {
      return NextResponse.json({ error: 'Não é possível editar uma nota já concluída' }, { status: 400 })
    }

    // Parse and whitelist body
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const patch: Partial<Record<CostField, unknown>> = {}
    for (const field of COST_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        patch[field] = body[field]
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await db
      .from('purchase_invoices_beta')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle()

    if (updateError) {
      console.error('[notas-entrada/[id] PATCH update]', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar nota fiscal' }, { status: 500 })
    }

    return NextResponse.json({ invoice: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notas-entrada/[id] PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
