/**
 * PATCH  /api/team/members/[id] — edit role/permissions
 * DELETE /api/team/members/[id] — remove member
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { dataOwnerId, error: authError } = await requirePermission('team:manage')
  if (authError) return authError

  const { id } = await params
  const body = await req.json() as { role?: string; permissions?: Record<string, boolean> }
  const db = supabaseAdmin()

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.role) update.role = body.role
  if (body.permissions) update.permissions = body.permissions

  const { error } = await db.from('team_members').update(update).eq('id', id).eq('owner_id', dataOwnerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { dataOwnerId, error: authError } = await requirePermission('team:manage')
  if (authError) return authError

  const { id } = await params
  const db = supabaseAdmin()

  await db.from('team_members')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', dataOwnerId)

  return NextResponse.json({ success: true })
}
