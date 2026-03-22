/**
 * POST /api/magalu/refresh
 * Força um refresh do access_token Magalu.
 * ATENÇÃO: O refresh_token do Magalu é USO ÚNICO!
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getValidMagaluToken } from '@/lib/magalu/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const result = await getValidMagaluToken(user.id)
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
