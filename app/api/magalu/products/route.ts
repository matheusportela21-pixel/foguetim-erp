/**
 * GET /api/magalu/products
 * Lista SKUs do seller no Magalu.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_SKUS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tokenData = await getValidMagaluToken(user.id)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const sp     = new URL(req.url).searchParams
  const offset = sp.get('offset') ?? '0'
  const limit  = sp.get('limit') ?? '50'
  const status = sp.get('status')

  try {
    const params: Record<string, string> = { offset, limit }
    if (status) params.status = status

    const data = await magaluGet(
      MAGALU_PATH_SKUS,
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
