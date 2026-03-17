/**
 * lib/email/weekly-summary.helper.ts
 * Shared logic to build and send the weekly summary email for a given user.
 * Used by both the manual POST route and the Sunday cron job.
 */
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { weeklySummaryTemplate }                       from './templates/weekly-summary'
import { sendEmail }                                    from './email.service'

/* ── Types ───────────────────────────────────────────────────────────────── */

interface WeekData {
  totalPedidos:   number
  receitaBruta:   number
  ticketMedio:    number
  enviosPendentes: number
  topProduto?: { title: string; quantidade: number; receita: number }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

async function fetchWeekOrders(
  mlId:  string | number,
  auth:  Record<string, string>,
  from:  Date,
  to:    Date,
): Promise<WeekData> {
  try {
    const r = await fetch(
      `${ML_API_BASE}/orders/search?seller=${mlId}&order.status=paid&sort=date_desc&limit=50` +
      `&order.date_created.from=${from.toISOString()}` +
      `&order.date_created.to=${to.toISOString()}`,
      { headers: auth },
    )
    if (!r.ok) return { totalPedidos: 0, receitaBruta: 0, ticketMedio: 0, enviosPendentes: 0 }

    const d = await r.json() as { results?: Record<string, unknown>[] }
    const orders = d.results ?? []

    let receitaBruta    = 0
    let enviosPendentes = 0
    const productMap    = new Map<string, { title: string; quantidade: number; receita: number }>()

    for (const o of orders) {
      const amount = Number(o.total_amount ?? 0)
      receitaBruta += amount

      const shipStatus = ((o.shipping as Record<string, unknown>)?.status) as string | undefined
      if (shipStatus === 'ready_to_ship' || shipStatus === 'handling') {
        enviosPendentes++
      }

      for (const rawItem of ((o.order_items as unknown[]) ?? [])) {
        const oi   = rawItem as Record<string, unknown>
        const item = (oi.item as Record<string, unknown>) ?? {}
        const id   = String(item.id ?? oi.id ?? '')
        const qty  = Number(oi.quantity ?? 1)
        const price = Number(oi.unit_price ?? 0)
        const cur  = productMap.get(id) ?? { title: String(item.title ?? ''), quantidade: 0, receita: 0 }
        productMap.set(id, { ...cur, quantidade: cur.quantidade + qty, receita: cur.receita + qty * price })
      }
    }

    const totalPedidos = orders.length
    const ticketMedio  = totalPedidos > 0 ? receitaBruta / totalPedidos : 0

    let topProduto: WeekData['topProduto']
    let maxReceita = 0
    for (const p of Array.from(productMap.values())) {
      if (p.receita > maxReceita) { maxReceita = p.receita; topProduto = p }
    }

    return { totalPedidos, receitaBruta, ticketMedio, enviosPendentes, topProduto }
  } catch {
    return { totalPedidos: 0, receitaBruta: 0, ticketMedio: 0, enviosPendentes: 0 }
  }
}

/* ── Main export ─────────────────────────────────────────────────────────── */

export async function buildAndSendWeeklySummary(user: {
  id:          string
  email:       string
  sellerName:  string
}): Promise<boolean> {
  if (!user.email) return false

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return false

  const token = await getValidToken(user.id)
  if (!token) return false

  const auth  = { Authorization: `Bearer ${token}` }
  const mlId  = conn.ml_user_id

  const now       = new Date()
  const weekStart = new Date(now);  weekStart.setDate(now.getDate() - 7)
  const prevStart = new Date(now);  prevStart.setDate(now.getDate() - 14)
  const prevEnd   = new Date(weekStart)

  const [curResult, prevResult, claimsRes, questionsRes] = await Promise.allSettled([
    fetchWeekOrders(mlId, auth, weekStart, now),
    fetchWeekOrders(mlId, auth, prevStart, prevEnd),
    fetch(`${ML_API_BASE}/post-sale/v2/claims?role=seller&status=ongoing&limit=1`, { headers: auth }),
    fetch(`${ML_API_BASE}/my/received_questions?seller_id=${mlId}&status=UNANSWERED&limit=1`, { headers: auth }),
  ])

  const cur  = curResult.status  === 'fulfilled' ? curResult.value  : { totalPedidos: 0, receitaBruta: 0, ticketMedio: 0, enviosPendentes: 0 }
  const prev = prevResult.status === 'fulfilled' ? prevResult.value : { totalPedidos: 0, receitaBruta: 0 }

  let reclamacoesAbertas = 0
  if (claimsRes.status === 'fulfilled' && claimsRes.value.ok) {
    const cd = await claimsRes.value.json() as { paging?: { total?: number }; total?: number }
    reclamacoesAbertas = cd.paging?.total ?? cd.total ?? 0
  }

  let perguntasPendentes = 0
  if (questionsRes.status === 'fulfilled' && questionsRes.value.ok) {
    const qd = await questionsRes.value.json() as { paging?: { total?: number }; total?: number }
    perguntasPendentes = qd.paging?.total ?? qd.total ?? 0
  }

  const pedidosVariacao = prev.totalPedidos > 0
    ? ((cur.totalPedidos - prev.totalPedidos) / prev.totalPedidos) * 100
    : 0
  const receitaVariacao = prev.receitaBruta > 0
    ? ((cur.receitaBruta - prev.receitaBruta) / prev.receitaBruta) * 100
    : 0
  const receitaLiquida = cur.receitaBruta * 0.87   // ~13% commission estimate

  const { subject, html } = weeklySummaryTemplate({
    sellerName:         user.sellerName,
    weekStart:          fmtDate(weekStart),
    weekEnd:            fmtDate(now),
    totalPedidos:       cur.totalPedidos,
    receitaBruta:       cur.receitaBruta,
    receitaLiquida,
    ticketMedio:        cur.ticketMedio,
    pedidosVariacao,
    receitaVariacao,
    reclamacoesAbertas,
    perguntasPendentes,
    enviosPendentes:    cur.enviosPendentes,
    topProduto:         cur.topProduto,
  })

  return sendEmail({ to: user.email, subject, html })
}
