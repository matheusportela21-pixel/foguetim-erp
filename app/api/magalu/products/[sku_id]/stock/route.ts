/**
 * GET  /api/magalu/products/[sku_id]/stock — buscar estoque
 * PATCH /api/magalu/products/[sku_id]/stock — atualizar estoque
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet, magaluPut } from '@/lib/magalu/client'
import { MAGALU_PATH_SKU_STOCKS } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sku_id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tokenData = await getValidMagaluToken(user.id)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const { sku_id } = await params
  const path = MAGALU_PATH_SKU_STOCKS.replace('{sku_id}', sku_id)

  try {
    const data = await magaluGet(path, tokenData.accessToken, tokenData.sellerId)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sku_id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tokenData = await getValidMagaluToken(user.id)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const { sku_id } = await params
  const body = await req.json()
  const path = MAGALU_PATH_SKU_STOCKS.replace('{sku_id}', sku_id)

  try {
    const data = await magaluPut(path, body, tokenData.accessToken, tokenData.sellerId)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
