/**
 * GET /api/financial/dre/products
 * Lucratividade por produto (top 10 melhores + 10 piores).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { calculateDRE } from '@/lib/financial/dre-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await requirePermission('financial:view')
  if (error) return error

  const sp = new URL(req.url).searchParams
  const now = new Date()
  const periodStart = sp.get('period_start') ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const periodEnd   = sp.get('period_end')   ?? now.toISOString().slice(0, 10)

  try {
    const dre = await calculateDRE(dataOwnerId, new Date(periodStart), new Date(periodEnd))

    const sorted = dre.productProfitability
    const top10    = sorted.slice(0, 10)
    const bottom10 = sorted.slice(-10).reverse()

    return NextResponse.json({ top10, bottom10, total: sorted.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
