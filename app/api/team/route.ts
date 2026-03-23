/**
 * GET /api/team — list team members + pending invites
 */
import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId, dataOwnerId, error } = await requirePermission('team:view')
  if (error) return error

  const db = supabaseAdmin()

  const [membersRes, invitesRes] = await Promise.all([
    db.from('team_members').select('*').eq('owner_id', dataOwnerId).neq('status', 'removed').order('created_at', { ascending: true }),
    db.from('team_invites').select('*').eq('owner_id', dataOwnerId).eq('status', 'pending').order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    members: membersRes.data ?? [],
    invites: invitesRes.data ?? [],
    isOwner: dataOwnerId === userId,
  })
}
