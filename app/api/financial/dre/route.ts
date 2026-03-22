/**
 * GET /api/financial/dre
 * Calcula ou retorna DRE do período.
 * Query: period_start, period_end, recalculate
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { calculateDRE } from '@/lib/financial/dre-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const recalculate = sp.get('recalculate') === '1'

  // Default: current month
  const now = new Date()
  const periodStart = sp.get('period_start') ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const periodEnd   = sp.get('period_end')   ?? now.toISOString().slice(0, 10)

  // Check cache first (unless recalculate)
  if (!recalculate) {
    const { data: cached } = await supabaseAdmin()
      .from('dre_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', periodStart)
      .eq('period_end', periodEnd)
      .maybeSingle()

    if (cached) {
      // Cache valid for 1 hour
      const cachedAt = new Date(cached.calculated_at).getTime()
      if (Date.now() - cachedAt < 3600_000) {
        return NextResponse.json({ dre: cached, source: 'cache' })
      }
    }
  }

  try {
    const dre = await calculateDRE(user.id, new Date(periodStart), new Date(periodEnd))
    return NextResponse.json({ dre, source: 'calculated' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[DRE] Erro ao calcular:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
