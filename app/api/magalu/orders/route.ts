/**
 * GET /api/magalu/orders
 * Lista pedidos do seller no Magalu.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_ORDERS } from '@/lib/magalu/config'

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
      MAGALU_PATH_ORDERS,
      tokenData.accessToken,
      tokenData.sellerId,
      params,
    )

    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
