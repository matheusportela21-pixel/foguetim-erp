/**
 * GET /api/armazem/notas-entrada/[id] — get invoice detail with items
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
