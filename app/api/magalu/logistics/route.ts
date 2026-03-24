/**
 * GET /api/magalu/logistics
 * Lista entregas/expedições do Magalu.
 * Tenta /seller/v1/deliveries — se 403/404, retorna fallback vazio.
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
  const status = sp.get('status')

  try {
    const params: Record<string, string> = { offset, limit }
    if (status) params.status = status

    const data = await magaluGet(
      '/seller/v1/deliveries',
      tokenData.accessToken,
      tokenData.sellerId,
      params,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any
    const items = Array.isArray(raw) ? raw
      : raw?.items ?? raw?.results ?? raw?.data ?? []
    const total = raw?.meta?.total ?? raw?.total ?? items.length

    return NextResponse.json({ items, total, available: true })
  } catch (err) {
    console.warn('[Magalu Logistics] endpoint error:', err)
    return NextResponse.json({ items: [], total: 0, available: false, message: 'Logistics endpoint não disponível neste escopo' })
  }
}
