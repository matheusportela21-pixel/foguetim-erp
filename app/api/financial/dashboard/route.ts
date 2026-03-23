/**
 * GET /api/financial/dashboard
 * KPIs financeiros reais: faturamento, lucro, margem, ticket, pedidos.
 * Retorna dados do mês atual + comparativo com mês anterior.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { calculateDRE } from '@/lib/financial/dre-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { dataOwnerId, error } = await requirePermission('financial:view')
  if (error) return error

  const now = new Date()

  // Current month
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentEnd   = now

  // Previous month (same day range for fair comparison)
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevEnd   = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate()))

  try {
    const [current, previous] = await Promise.all([
      calculateDRE(dataOwnerId, currentStart, currentEnd),
      calculateDRE(dataOwnerId, prevStart, prevEnd).catch(() => null),
    ])

    const pctChange = (cur: number, prev: number | undefined): number | null => {
      if (prev == null || prev === 0) return null
      return ((cur - prev) / prev) * 100
    }

    return NextResponse.json({
      current: {
        revenue:       current.revenue.total,
        netProfit:     current.netProfit,
        netMarginPct:  current.netMarginPct,
        ticketMedio:   current.ticketMedio,
        ordersCount:   current.ordersCount,
        grossProfit:   current.grossProfit,
        grossMarginPct: current.grossMarginPct,
      },
      changes: {
        revenue:       pctChange(current.revenue.total, previous?.revenue.total),
        netProfit:     pctChange(current.netProfit, previous?.netProfit),
        netMarginPct:  previous ? current.netMarginPct - previous.netMarginPct : null,
        ticketMedio:   pctChange(current.ticketMedio, previous?.ticketMedio),
        ordersCount:   pctChange(current.ordersCount, previous?.ordersCount),
      },
      // Composition chart data
      composition: {
        cmv:           current.cmv.total,
        commissions:   current.deductions.commissions_ml + current.deductions.commissions_shopee,
        shipping:      current.deductions.shipping,
        taxes:         current.deductions.taxes,
        expenses:      current.operationalExpenses,
        profit:        current.netProfit,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
