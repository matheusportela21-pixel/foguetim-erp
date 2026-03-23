/**
 * POST /api/magalu/sandbox/onboarding
 * Cria seller fictício no sandbox do Magalu para testes.
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluPut } from '@/lib/magalu/client'
import { MAGALU_PATH_SANDBOX_ONBOARDING, MAGALU_SANDBOX_CHANNEL_ID } from '@/lib/magalu/config'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
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
