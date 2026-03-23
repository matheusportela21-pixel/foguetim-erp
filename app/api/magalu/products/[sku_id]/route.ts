/**
 * GET /api/magalu/products/[sku_id]
 * Detalhe de um SKU no Magalu.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { MAGALU_PATH_SKU_DETAIL } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sku_id: string }> }) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const { sku_id } = await params

  try {
    const path = MAGALU_PATH_SKU_DETAIL.replace('{sku_id}', sku_id)
    const data = await magaluGet(path, tokenData.accessToken, tokenData.sellerId)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
