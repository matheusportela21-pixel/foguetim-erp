/**
 * GET /api/armazem/notas-entrada — list purchase invoices (admin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'foguetim_support']

export async function GET(_req: NextRequest) {
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

    const { data, error, count } = await db
      .from('purchase_invoices_beta')
      .select('*, items:purchase_invoice_items_beta(id)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[notas-entrada GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar notas de entrada' }, { status: 500 })
    }

    // Add items_count to each row
    const enriched = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      items_count: Array.isArray(row.items) ? (row.items as unknown[]).length : 0,
      items: undefined,
    }))

    return NextResponse.json({ data: enriched, total: count ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[notas-entrada GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
