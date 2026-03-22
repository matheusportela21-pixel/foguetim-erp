/**
 * GET /api/team — list team members + pending invites
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOwnerUserId } from '@/lib/team/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const db = supabaseAdmin()
  const ownerId = await getOwnerUserId(user.id)

  const [membersRes, invitesRes] = await Promise.all([
    db.from('team_members').select('*').eq('owner_id', ownerId).neq('status', 'removed').order('created_at', { ascending: true }),
    db.from('team_invites').select('*').eq('owner_id', ownerId).eq('status', 'pending').order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    members: membersRes.data ?? [],
    invites: invitesRes.data ?? [],
    isOwner: ownerId === user.id,
  })
}
