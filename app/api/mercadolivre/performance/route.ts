/**
 * GET /api/mercadolivre/performance
 * Retorna dados de performance de vendas agrupados por período.
 *
 * Query params:
 *   period  7d | 30d | 90d | 12m  (padrão: 30d)
 *
 * SOMENTE LEITURA.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }              from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface RawOrder {
  status:       string
  date_created: string
  total_amount: number
}

interface ChartPoint {
  date:        string
  label:       string
  pedidos:     number
  receita:     number
  ticket_medio: number
}

interface WeekdayPoint {
  weekday: string
  pedidos: number
  receita: number
}

interface HourPoint {
  hour:    number
  pedidos: number
}

/* ── Config ─────────────────────────────────────────────────────────────────── */
const ORDERS_LIMIT = 50
const MAX_PAGES    = 40   // segurança: até 2 000 pedidos

const WEEKDAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

/** Retorna a string de chave de grupo e o label legível para um timestamp */
function groupKey(
  isoDate: string,
  granularity: 'day' | 'week' | 'month',
): { key: string; label: string } {
  const d = new Date(isoDate)
  const yyyy = d.getUTCFullYear()
  const mm   = d.getUTCMonth() + 1
  const dd   = d.getUTCDate()

  if (granularity === 'month') {
    const key   = `${yyyy}-${String(mm).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    return { key, label }
  }

  if (granularity === 'week') {
    // ISO week: encontrar a segunda-feira da semana
    const dayOfWeek = d.getUTCDay()  // 0=Dom, 1=Seg…
    const diff      = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek
    const mon       = new Date(d)
    mon.setUTCDate(dd + diff)

    // Número da semana ISO simplificado: semana do ano
    const startOfYear = new Date(Date.UTC(yyyy, 0, 1))
    const weekNo = Math.ceil(((mon.getTime() - startOfYear.getTime()) / 86400_000 + startOfYear.getUTCDay() + 1) / 7)

    const key   = `${yyyy}-W${String(weekNo).padStart(2, '0')}`
    const label = `Sem ${weekNo}`
    return { key, label }
  }

  // day
  const key   = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  const label = `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}`
  return { key, label }
}

/** Percentage variation — evita divisão por zero */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/* ── Route handler ─────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ connected: false })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  /* ── Parâmetros ────────────────────────────────────────────────────────── */
  const sp     = new URL(req.url).searchParams
  const period = sp.get('period') ?? '30d'

  let days        = 30
  let granularity: 'day' | 'week' | 'month' = 'day'

  if      (period === '7d')  { days = 7;   granularity = 'day'   }
  else if (period === '30d') { days = 30;  granularity = 'day'   }
  else if (period === '90d') { days = 90;  granularity = 'week'  }
  else if (period === '12m') { days = 365; granularity = 'month' }

  const auth    = { Authorization: `Bearer ${token}` }
  const mlId    = conn.ml_user_id
  const now     = Date.now()
  const msDay   = 86400_000

  const currentFrom = new Date(now - days * msDay).toISOString()
  const prevFrom    = new Date(now - 2 * days * msDay).toISOString()
  const prevTo      = new Date(now - days * msDay).toISOString()

  /* ── Fetch helper — pagina todos os pedidos de um intervalo ───────────── */
  async function fetchOrders(from: string, to?: string): Promise<RawOrder[]> {
    const all: RawOrder[] = []
    let offset   = 0
    let total    = Infinity
    let pages    = 0

    while (offset < total && pages < MAX_PAGES) {
      const toParam = to ? `&order.date_created.to=${to}` : ''
      const url = (
        `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_asc` +
        `&limit=${ORDERS_LIMIT}&offset=${offset}` +
        `&order.date_created.from=${from}${toParam}`
      )
      const r = await fetch(url, { headers: auth })
      if (!r.ok) break

      const d  = await r.json()
      total    = d.paging?.total ?? 0

      const results: RawOrder[] = (d.results ?? []).map((o: Record<string, unknown>) => ({
        status:       String(o.status ?? ''),
        date_created: String(o.date_created ?? ''),
        total_amount: Number(o.total_amount ?? 0),
      }))

      all.push(...results)
      offset += results.length
      pages++
      if (results.length < ORDERS_LIMIT) break
    }

    return all
  }

  /* ── Buscar ambos os períodos em paralelo ─────────────────────────────── */
  let currentOrders: RawOrder[] = []
  let prevOrders:    RawOrder[] = []

  try {
    ;[currentOrders, prevOrders] = await Promise.all([
      fetchOrders(currentFrom),
      fetchOrders(prevFrom, prevTo),
    ])
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar pedidos do ML' }, { status: 500 })
  }

  /* ── Filtrar cancelados ────────────────────────────────────────────────── */
  const valid     = currentOrders.filter(o => o.status !== 'cancelled')
  const prevValid = prevOrders.filter(o => o.status !== 'cancelled')

  /* ── Agregar por período ──────────────────────────────────────────────── */
  const buckets = new Map<string, { label: string; pedidos: number; receita: number }>()

  for (const o of valid) {
    const { key, label } = groupKey(o.date_created, granularity)
    const existing = buckets.get(key) ?? { label, pedidos: 0, receita: 0 }
    existing.pedidos++
    existing.receita += o.total_amount
    buckets.set(key, existing)
  }

  // Garantir que todos os dias/semanas/meses do período apareçam no gráfico
  // (mesmo sem pedidos naquele dia)
  if (granularity === 'day') {
    for (let i = 0; i < days; i++) {
      const d   = new Date(now - (days - 1 - i) * msDay)
      const { key, label } = groupKey(d.toISOString(), 'day')
      if (!buckets.has(key)) buckets.set(key, { label, pedidos: 0, receita: 0 })
    }
  }

  const sortedKeys  = Array.from(buckets.keys()).sort()
  const chart_data: ChartPoint[] = sortedKeys.map(key => {
    const b = buckets.get(key)!
    return {
      date:         key,
      label:        b.label,
      pedidos:      b.pedidos,
      receita:      Math.round(b.receita * 100) / 100,
      ticket_medio: b.pedidos > 0 ? Math.round((b.receita / b.pedidos) * 100) / 100 : 0,
    }
  })

  /* ── Sumário ─────────────────────────────────────────────────────────── */
  const total_pedidos = valid.length
  const receita_bruta = Math.round(valid.reduce((s, o) => s + o.total_amount, 0) * 100) / 100
  const ticket_medio  = total_pedidos > 0
    ? Math.round((receita_bruta / total_pedidos) * 100) / 100
    : 0

  const prevPedidos = prevValid.length
  const prevReceita = prevValid.reduce((s, o) => s + o.total_amount, 0)

  let melhor_dia = { date: '', receita: 0 }
  let pior_dia   = { date: '', receita: Infinity }

  for (const pt of chart_data) {
    if (pt.receita > melhor_dia.receita) melhor_dia = { date: pt.label, receita: pt.receita }
    if (pt.pedidos > 0 && pt.receita < pior_dia.receita) pior_dia = { date: pt.label, receita: pt.receita }
  }
  if (pior_dia.receita === Infinity) pior_dia = { date: '—', receita: 0 }

  /* ── Por dia da semana ───────────────────────────────────────────────── */
  const wdBuckets = Array.from({ length: 7 }, (_, i): WeekdayPoint => ({
    weekday: WEEKDAYS[i],
    pedidos: 0,
    receita: 0,
  }))

  for (const o of valid) {
    const wd = new Date(o.date_created).getDay()  // 0=Dom
    wdBuckets[wd].pedidos++
    wdBuckets[wd].receita += o.total_amount
  }

  // Reordenar: Segunda → Domingo
  const by_weekday: WeekdayPoint[] = [
    ...wdBuckets.slice(1),
    wdBuckets[0],
  ].map(b => ({ ...b, receita: Math.round(b.receita * 100) / 100 }))

  /* ── Por hora ────────────────────────────────────────────────────────── */
  const hourBuckets = Array.from({ length: 24 }, (_, h): HourPoint => ({ hour: h, pedidos: 0 }))

  for (const o of valid) {
    try {
      const h = new Date(o.date_created).getHours()
      if (h >= 0 && h <= 23) hourBuckets[h].pedidos++
    } catch { /* ignore */ }
  }

  const by_hour: HourPoint[] = hourBuckets

  /* ── Resposta ─────────────────────────────────────────────────────────── */
  return NextResponse.json({
    connected: true,
    period,
    orders_processed: valid.length,
    summary: {
      total_pedidos,
      receita_bruta,
      ticket_medio,
      melhor_dia,
      pior_dia,
      variacao_receita: pctChange(receita_bruta, prevReceita),
      variacao_pedidos: pctChange(total_pedidos, prevPedidos),
    },
    chart_data,
    by_weekday,
    by_hour,
  })
}
