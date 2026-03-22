/**
 * POST /api/team/members/[id]/disable — disable member
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  await supabaseAdmin().from('team_members')
    .update({ status: 'disabled', updated_at: new Date().toISOString() })
    .eq('id', id).eq('owner_id', user.id)

  return NextResponse.json({ success: true })
}
