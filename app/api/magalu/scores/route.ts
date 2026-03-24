/**
 * GET /api/magalu/scores
 * Lista scores de saúde dos SKUs no Magalu.
 * Tenta /seller/v1/scores — se 403/404, retorna fallback vazio.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const sp     = new URL(req.url).searchParams
  const offset = sp.get('offset') ?? '0'
  const limit  = sp.get('limit') ?? '50'

  try {
    const data = await magaluGet(
      '/seller/v1/portfolios/products/scores',
      tokenData.accessToken,
      tokenData.sellerId,
      { offset, limit },
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any
    const items = Array.isArray(raw) ? raw
      : raw?.items ?? raw?.results ?? raw?.data ?? []
    const total = raw?.meta?.total ?? raw?.total ?? items.length

    return NextResponse.json({ items, total, available: true })
  } catch (err) {
    console.warn('[Magalu Scores] endpoint error:', err)
    return NextResponse.json({ items: [], total: 0, available: false, message: 'Scores endpoint não disponível neste escopo' })
  }
}
