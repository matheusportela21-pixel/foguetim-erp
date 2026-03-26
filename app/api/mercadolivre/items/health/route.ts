/**
 * GET /api/mercadolivre/items/health
 * Returns counts of items by health status (healthy, warning, unhealthy)
 * and lists of unhealthy/warning items for display.
 * Also returns count of items missing product identifiers (GTIN/EAN).
 *
 * SOMENTE LEITURA.
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

interface HealthItem {
  id: string
  title: string
  price: number
  thumbnail: string
  permalink: string
  health: string
}

interface SearchResult {
  results: Array<{
    id: string
    title: string
    price: number
    thumbnail: string
    permalink: string
  }>
  paging: { total: number; offset: number; limit: number }
}

async function fetchHealthCount(
  sellerId: number,
  token: string,
  status: string,
  limit = 1,
): Promise<{ total: number; items: HealthItem[] }> {
  const url = `${ML_API_BASE}/users/${sellerId}/items/search?reputation_health_gauge=${status}&limit=${limit}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return { total: 0, items: [] }
  }

  const data: SearchResult = await res.json()
  const total = data.paging?.total ?? 0
  const items: HealthItem[] = (data.results ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    price: r.price,
    thumbnail: r.thumbnail,
    permalink: r.permalink,
    health: status,
  }))

  return { total, items }
}

async function fetchMissingIdentifiers(
  sellerId: number,
  token: string,
): Promise<number> {
  const url = `${ML_API_BASE}/users/${sellerId}/items/search?missing_product_identifiers=true&limit=1`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return 0

  const data = (await res.json()) as { paging?: { total?: number } }
  return data.paging?.total ?? 0
}

export async function GET() {
  const { error: authError, dataOwnerId } = await requirePermission('products:view')
  if (authError) return authError

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json(
      { error: 'ML nao conectado', notConnected: true },
      { status: 200 },
    )
  }

  const token = await getValidToken(dataOwnerId)
  if (!token) {
    return NextResponse.json(
      { error: 'Token invalido - reconecte o ML' },
      { status: 401 },
    )
  }

  try {
    // Fetch counts and item lists in parallel
    const [healthyResult, warningResult, unhealthyResult, missingIdentifiers] =
      await Promise.all([
        fetchHealthCount(conn.ml_user_id, token, 'healthy', 1),
        fetchHealthCount(conn.ml_user_id, token, 'warning', 50),
        fetchHealthCount(conn.ml_user_id, token, 'unhealthy', 50),
        fetchMissingIdentifiers(conn.ml_user_id, token),
      ])

    const healthy = healthyResult.total
    const warning = warningResult.total
    const unhealthy = unhealthyResult.total
    const total = healthy + warning + unhealthy

    return NextResponse.json({
      healthy,
      warning,
      unhealthy,
      total,
      unhealthyItems: unhealthyResult.items,
      warningItems: warningResult.items,
      missingIdentifiers,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML items health GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
