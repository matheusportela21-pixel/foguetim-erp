/**
 * GET /api/magalu/orders/[order_id]
 * Detalhe de um pedido no Magalu, incluindo entregas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_ORDER_DETAIL, MAGALU_PATH_ORDER_DELIVERIES } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ order_id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tokenData = await getValidMagaluToken(user.id)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const { order_id } = await params

  try {
    const orderPath      = MAGALU_PATH_ORDER_DETAIL.replace('{order_id}', order_id)
    const deliveriesPath = MAGALU_PATH_ORDER_DELIVERIES.replace('{order_id}', order_id)

    const [order, deliveries] = await Promise.all([
      magaluGet(orderPath, tokenData.accessToken, tokenData.sellerId),
      magaluGet(deliveriesPath, tokenData.accessToken, tokenData.sellerId).catch(() => []),
    ])

    return NextResponse.json({ order, deliveries })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
