/**
 * GET /api/returns/stats — KPIs de devoluções
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) return NextResponse.json({ connected: false, total: 0, opened: 0, closed: 0 })

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ connected: false, total: 0, opened: 0, closed: 0 })

  try {
    const [openedRes, closedRes] = await Promise.all([
      fetch(`${ML_API_BASE}/claims/search?seller_id=${conn.ml_user_id}&status=opened&limit=1`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${ML_API_BASE}/claims/search?seller_id=${conn.ml_user_id}&status=closed&limit=1`, { headers: { Authorization: `Bearer ${token}` } }),
    ])

    const opened = openedRes.ok ? (await openedRes.json()).paging?.total ?? 0 : 0
    const closed = closedRes.ok ? (await closedRes.json()).paging?.total ?? 0 : 0

    return NextResponse.json({
      connected: true,
      total:  opened + closed,
      opened,
      closed,
    })
  } catch {
    return NextResponse.json({ connected: false, total: 0, opened: 0, closed: 0 })
  }
}
