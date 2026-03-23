/**
 * POST /api/magalu/refresh
 * Força um refresh do access_token Magalu.
 * ATENÇÃO: O refresh_token do Magalu é USO ÚNICO!
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  try {
    const result = await getValidMagaluToken(dataOwnerId)
    if (!result) {
      return NextResponse.json({ error: 'Nenhuma conexão Magalu ativa' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Token atualizado' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Magalu refresh] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
