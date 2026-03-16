/**
 * POST /api/mercadolivre/listings/sync
 * Body: { limit?: number }
 *
 * Sincroniza anúncios do ML (active, paused, under_review, closed, inactive)
 * para a tabela local ml_listings.
 * Retorna: { synced: N, errors: N, duration_ms: N }
 */
import { NextResponse }            from 'next/server'
import { getAuthUser }             from '@/lib/server-auth'
import { getMLConnection, getValidToken } from '@/lib/mercadolivre'
import { syncListingsFromML }      from '@/lib/ml/listings/ml-listings-sync.service'

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  let limit: number = 2000

  try {
    const body = await req.json() as { limit?: number }
    if (body.limit) limit = Math.min(Math.max(1, body.limit), 5000)
  } catch { /* body vazio — usar defaults */ }

  const t0 = Date.now()

  try {
    const result = await syncListingsFromML(
      user.id,
      String(conn.ml_user_id),
      token,
      { limit },
    )

    return NextResponse.json({
      ...result,
      duration_ms: Date.now() - t0,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[listings/sync]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
