/**
 * GET /api/mercadolivre/financeiro
 * Agrega dados financeiros a partir dos pedidos do ML.
 *
 * Query params:
 *   period  mes | trimestre | ano  (default: mes)
 *
 * Retorna: receita_bruta, taxas_ml, receita_liquida, pedidos, ticket_medio
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const ORDERS_LIMIT = 50
const MAX_PAGES    = 20   // até 1.000 pedidos
const DELAY_MS     = 150

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const PERIOD_DAYS: Record<string, number> = {
  mes:        30,
  trimestre:  90,
  ano:        365,
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const sp        = new URL(req.url).searchParams
  const period    = sp.get('period') ?? 'mes'
  const days      = PERIOD_DAYS[period] ?? 30
  // Suporte a date_from/date_to explícitos (ex.: para alinhar com períodos de billing)
  const dateFromParam = sp.get('date_from')
  const dateToParam   = sp.get('date_to')

  const auth     = { Authorization: `Bearer ${token}` }
  const mlId     = conn.ml_user_id
  const dateFrom = dateFromParam ?? new Date(Date.now() - days * 86_400_000).toISOString()

  // ── Busca paginada de pedidos ─────────────────────────────────────────────
  const allOrders: Record<string, unknown>[] = []
  let offset          = 0
  let totalFromPaging = Infinity
  let pages           = 0

  while (offset < totalFromPaging && pages < MAX_PAGES) {
    const r = await fetch(
      `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc` +
      `&limit=${ORDERS_LIMIT}&offset=${offset}` +
      `&order.date_created.from=${dateFrom}` +
      (dateToParam ? `&order.date_created.to=${dateToParam}` : ''),
      { headers: auth },
    )
    if (!r.ok) break

    const d = await r.json()
    totalFromPaging = d.paging?.total ?? 0

    const results: Record<string, unknown>[] = d.results ?? []
    allOrders.push(...results)
    offset += results.length
    pages++

    if (results.length < ORDERS_LIMIT) break

    if (pages < MAX_PAGES && offset < totalFromPaging) {
      await sleep(DELAY_MS)
    }
  }

  // ── Agrega métricas (excluindo cancelados) ────────────────────────────────
  let receita_bruta = 0
  let taxas_ml      = 0
  let pedidos       = 0

  for (const order of allOrders) {
    if ((order.status as string) === 'cancelled') continue
    pedidos++

    receita_bruta += Number(order.total_amount ?? 0)

    const orderItems = (order.order_items as Record<string, unknown>[]) ?? []
    for (const oi of orderItems) {
      taxas_ml += Number(oi.sale_fee ?? 0)
    }
  }

  const receita_liquida = receita_bruta - taxas_ml
  const ticket_medio    = pedidos > 0 ? receita_bruta / pedidos : 0

  return NextResponse.json(
    {
      connected: true,
      period,
      days,
      pedidos,
      receita_bruta,
      taxas_ml,
      receita_liquida,
      ticket_medio,
    },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  )
}
