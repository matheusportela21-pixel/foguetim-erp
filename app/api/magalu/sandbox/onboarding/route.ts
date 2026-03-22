/**
 * POST /api/magalu/sandbox/onboarding
 * Cria seller fictício no sandbox do Magalu para testes.
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluPut } from '@/lib/magalu/client'
import { MAGALU_PATH_SANDBOX_ONBOARDING, MAGALU_SANDBOX_CHANNEL_ID } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tokenData = await getValidMagaluToken(user.id)
  if (!tokenData) {
    return NextResponse.json({ error: 'Nenhuma conexão Magalu ativa. Conecte primeiro.' }, { status: 400 })
  }

  try {
    const result = await magaluPut(
      MAGALU_PATH_SANDBOX_ONBOARDING,
      { channel_id: MAGALU_SANDBOX_CHANNEL_ID },
      tokenData.accessToken,
      tokenData.sellerId,
    )

    console.log('[Magalu sandbox] onboarding OK:', result)
    return NextResponse.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Magalu sandbox] onboarding erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
