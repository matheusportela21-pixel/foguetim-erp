/**
 * DELETE /api/team/invite/[token]/revoke — revoke pending invite by token
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { token } = await params
  const db = supabaseAdmin()

  // Find invite by token
  const { data: invite } = await db
    .from('team_invites')
    .select('id, email')
    .eq('token', token)
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
  }

  await db.from('team_invites').update({ status: 'revoked' }).eq('id', invite.id)
  await db.from('team_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .eq('email', invite.email)
    .eq('status', 'pending')

  return NextResponse.json({ success: true })
}
