/**
 * DELETE /api/team/invite/[id]/revoke — revoke pending invite
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const db = supabaseAdmin()

  await db.from('team_invites').update({ status: 'revoked' }).eq('id', id).eq('owner_id', user.id)
  await db.from('team_members').update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('owner_id', user.id)
    .eq('status', 'pending')

  return NextResponse.json({ success: true })
}
