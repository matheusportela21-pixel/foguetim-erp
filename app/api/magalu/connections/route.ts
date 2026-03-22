/**
 * GET    /api/magalu/connections — lista conexões Magalu
 * DELETE /api/magalu/connections?id=xxx — desconecta uma conta
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMagaluConnections, disconnectMagaluById } from '@/lib/magalu/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const connections = await getMagaluConnections(user.id)
  return NextResponse.json({
    connections: connections.map(c => ({
      id:            c.id,
      seller_id:     c.ml_user_id,
      seller_name:   c.ml_nickname,
      account_label: c.account_label,
      is_primary:    c.is_primary,
      expires_at:    c.expires_at,
      connected:     c.connected,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  await disconnectMagaluById(user.id, id)
  return NextResponse.json({ success: true })
}
