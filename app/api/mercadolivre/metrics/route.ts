/**
 * GET /api/mercadolivre/metrics
 * Retorna métricas agregadas do ML para o dashboard.
 *
 * Retorna:
 *   connected        boolean
 *   nickname         string
 *   totalActive      número de anúncios ativos
 *   totalOrders30d   pedidos dos últimos 30 dias (excl. cancelados)
 *   revenue30d       faturamento bruto dos últimos 30 dias (excl. cancelados)
 *   avgTicket        ticket médio
 *   pendingQuestions perguntas não respondidas
 *
 * SOMENTE LEITURA.
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

const ORDERS_LIMIT = 50   // ML max por página
const MAX_PAGES    = 10   // segurança: máximo 500 pedidos (10 × 50)

export async function GET(req: Request) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ connected: false })
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const auth  = { Authorization: `Bearer ${token}` }
  const mlId  = conn.ml_user_id

  // Accept ?days=N parameter (default 30)
  const url = new URL(req.url)
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 90)
  const dateFrom = new Date(Date.now() - days * 86400_000).toISOString()

  // ── Anúncios ativos + Perguntas pendentes — em paralelo ──────────────────
  const [activeRes, questionsRes] = await Promise.allSettled([
    fetch(`${ML_API_BASE}/users/${mlId}/items/search?status=active&limit=1`, { headers: auth }),
    fetch(`${ML_API_BASE}/questions/search?seller_id=${mlId}&status=UNANSWERED&limit=1`, { headers: auth }),
  ])

  let totalActive = 0
  if (activeRes.status === 'fulfilled' && activeRes.value.ok) {
    const d = await activeRes.value.json()
    totalActive = d.paging?.total ?? 0
  }

  let pendingQuestions = 0
  if (questionsRes.status === 'fulfilled' && questionsRes.value.ok) {
    const d = await questionsRes.value.json()
    pendingQuestions = d.paging?.total ?? 0
  }

  // ── Pedidos 30d — paginar TODOS, excluir cancelados ──────────────────────
  let totalOrders30d = 0
  let revenue30d     = 0

  try {
    const allOrders: Record<string, unknown>[] = []
    let offset          = 0
    let totalFromPaging = Infinity
    let pages           = 0

    while (offset < totalFromPaging && pages < MAX_PAGES) {
      const r = await fetch(
        `${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc` +
        `&limit=${ORDERS_LIMIT}&offset=${offset}` +
        `&order.date_created.from=${dateFrom}`,
        { headers: auth }
      )
      if (!r.ok) break

      const d = await r.json()
      totalFromPaging = d.paging?.total ?? 0

      const results: Record<string, unknown>[] = d.results ?? []
      allOrders.push(...results)
      offset += results.length
      pages++

      if (results.length < ORDERS_LIMIT) break   // última página
    }

    // Excluir pedidos cancelados e somar faturamento
    const valid = allOrders.filter(o => o.status !== 'cancelled')
    totalOrders30d = valid.length
    revenue30d = valid.reduce(
      (sum, o) => sum + Number(o.total_amount ?? 0), 0
    )
  } catch {
    // silently ignore — retorna zeros
  }

  const avgTicket = totalOrders30d > 0 ? revenue30d / totalOrders30d : 0

  return NextResponse.json({
    connected:        true,
    nickname:         conn.ml_nickname,
    totalActive,
    totalOrders30d,
    revenue30d,
    avgTicket,
    pendingQuestions,
    days,
  })
}
