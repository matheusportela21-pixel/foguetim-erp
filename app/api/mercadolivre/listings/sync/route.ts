/**
 * POST /api/mercadolivre/listings/sync
 * Body: { status?: 'active' | 'all'; limit?: number }
 *
 * Sincroniza anúncios do ML para a tabela local ml_listings.
 * Retorna: { synced: N, errors: N, duration_ms: N }
 */
import { NextResponse }            from 'next/server'
import { getAuthUser }             from '@/lib/server-auth'
import { getMLConnection, getValidToken } from '@/lib/mercadolivre'
import { supabaseAdmin }           from '@/lib/supabase-admin'
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

  let status: string  = 'active'
  let limit:  number  = 2000

  try {
    const body = await req.json() as { status?: string; limit?: number }
    if (body.status) status = body.status
    if (body.limit)  limit  = Math.min(Math.max(1, body.limit), 5000)
  } catch { /* body vazio — usar defaults */ }

  const t0 = Date.now()

  try {
    const result = await syncListingsFromML(
      user.id,
      String(conn.ml_user_id),
      token,
      supabaseAdmin(),
      { limit, status },
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
