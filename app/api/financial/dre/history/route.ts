/**
 * GET /api/financial/dre/history
 * Retorna histórico de DRE dos últimos 12 meses.
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('dre_reports')
    .select('period_start, period_end, revenue_total, net_revenue, gross_profit, gross_margin_pct, net_profit, net_margin_pct, orders_count, ticket_medio, operational_expenses, deductions_total, cmv_total')
    .eq('user_id', user.id)
    .order('period_start', { ascending: false })
    .limit(12)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ history: data ?? [] })
}
