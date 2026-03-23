/**
 * POST /api/shopee/refresh
 * Renova manualmente o access_token Shopee para o usuário autenticado.
 * Normalmente o refresh é automático via getValidShopeeToken(),
 * mas este endpoint permite forçar manualmente (ex: botão "Sincronizar").
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidShopeeToken } from '@/lib/shopee/auth'

export async function POST() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  try {
    const result = await getValidShopeeToken(dataOwnerId)
    if (!result) {
      return NextResponse.json({ error: 'Nenhuma conexão Shopee ativa' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, shop_id: result.shopId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee refresh] Erro:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
