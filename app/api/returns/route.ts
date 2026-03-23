/**
 * GET /api/returns — list returns/refunds from ML claims API (type=returns)
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ returns: [], connected: false })

  const token = await getValidToken(dataOwnerId)
  if (!token) return NextResponse.json({ returns: [], connected: false })

  const sp     = new URL(req.url).searchParams
  const status = sp.get('status') ?? 'opened'
  const offset = sp.get('offset') ?? '0'
  const limit  = sp.get('limit') ?? '50'

  try {
    const res = await fetch(
      `${ML_API_BASE}/v1/claims/search?seller_id=${conn.ml_user_id}&status=${status}&type=returns&offset=${offset}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (!res.ok) {
      // Fallback: try standard claims endpoint
      const fallback = await fetch(
        `${ML_API_BASE}/claims/search?seller_id=${conn.ml_user_id}&status=${status}&offset=${offset}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!fallback.ok) return NextResponse.json({ returns: [], total: 0 })
      const data = await fallback.json()
      return NextResponse.json({ returns: data.results ?? data.data ?? [], total: data.paging?.total ?? 0 })
    }

    const data = await res.json()
    return NextResponse.json({ returns: data.results ?? data.data ?? [], total: data.paging?.total ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
