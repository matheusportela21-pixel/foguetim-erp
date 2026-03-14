/**
 * GET /api/mercadolivre/reputacao
 * Busca reputação do vendedor no ML.
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

  try {
    // Main user endpoint has seller_reputation
    const res = await fetch(`${ML_API_BASE}/users/${mlId}`, { headers: auth })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`ML users (${res.status}): ${txt}`)
    }
    const data = await res.json()
    const rep = data.seller_reputation ?? {}

    // Also try to get reputation levels for more detail (may 404 on some accounts)
    let levels: unknown = null
    try {
      const lr = await fetch(`${ML_API_BASE}/users/${mlId}/seller_reputation_levels`, { headers: auth })
      if (lr.ok) levels = await lr.json()
    } catch { /* silently ignore */ }

    return NextResponse.json({
      connected: true,
      nickname: data.nickname ?? conn.ml_nickname,
      seller_reputation: {
        level_id: rep.level_id ?? null,
        power_seller_status: rep.power_seller_status ?? null,
        transactions: rep.transactions ?? null,
        metrics: rep.metrics ?? null,
      },
      levels,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML reputacao GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
