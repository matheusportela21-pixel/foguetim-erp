/**
 * GET /api/mercadolivre/status
 * Returns the current ML connection status for the authenticated user.
 * SEC-014: Resolve ownership para team members verem dados do dono.
 */
import { NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getMLConnection } from '@/lib/mercadolivre'

export async function GET() {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return NextResponse.json({ connected: false })

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) return NextResponse.json({ connected: false })

  return NextResponse.json({
    connected:   true,
    nickname:    conn.ml_nickname,
    ml_user_id:  conn.ml_user_id,
    expires_at:  conn.expires_at,
  })
}
