/**
 * GET /api/mercadolivre/metrics
 * Retorna métricas agregadas do ML para o dashboard.
 *
 * Retorna:
 *   connected        boolean
 *   nickname         string
 *   totalActive      número de anúncios ativos
 *   totalOrders30d   pedidos dos últimos 30 dias
 *   revenue30d       faturamento bruto dos últimos 30 dias
 *   avgTicket        ticket médio
 *   pendingQuestions perguntas não respondidas
 *
 * SOMENTE LEITURA.
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ connected: false })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, error: 'Token inválido' })

  const auth = { Authorization: `Bearer ${token}` }
  const mlId = conn.ml_user_id

  // Faz as 3 chamadas em paralelo para velocidade
  const dateFrom30d = new Date(Date.now() - 30 * 86400_000).toISOString()

  const [activeRes, ordersRes, questionsRes] = await Promise.allSettled([
    fetch(`${ML_API_BASE}/users/${mlId}/items/search?status=active&limit=1`, { headers: auth }),
    fetch(`${ML_API_BASE}/orders/search?seller=${mlId}&sort=date_desc&limit=50&order.date_created.from=${dateFrom30d}`, { headers: auth }),
    fetch(`${ML_API_BASE}/questions/search?seller_id=${mlId}&status=UNANSWERED&limit=1`, { headers: auth }),
  ])

  // Active items count
  let totalActive = 0
  if (activeRes.status === 'fulfilled' && activeRes.value.ok) {
    const d = await activeRes.value.json()
    totalActive = d.paging?.total ?? 0
  }

  // Orders 30d
  let totalOrders30d = 0
  let revenue30d = 0
  if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
    const d = await ordersRes.value.json()
    totalOrders30d = d.paging?.total ?? (d.results?.length ?? 0)
    revenue30d = (d.results ?? []).reduce(
      (sum: number, o: Record<string, unknown>) => sum + Number(o.total_amount ?? 0), 0
    )
  }

  // Pending questions
  let pendingQuestions = 0
  if (questionsRes.status === 'fulfilled' && questionsRes.value.ok) {
    const d = await questionsRes.value.json()
    pendingQuestions = d.paging?.total ?? (d.questions?.length ?? 0)
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
  })
}
