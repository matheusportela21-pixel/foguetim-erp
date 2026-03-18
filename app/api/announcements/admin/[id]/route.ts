/**
 * PATCH  /api/announcements/admin/[id] — atualiza aviso
 * DELETE /api/announcements/admin/[id] — desativa aviso
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

const ADMIN_ROLES = ['admin', 'super_admin', 'owner', 'foguetim_support']

async function requireAdmin(userId: string) {
  const { data } = await supabaseAdmin()
    .from('users').select('role').eq('id', userId).single()
  return data?.role && ADMIN_ROLES.includes(data.role)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try { body = await req.json() as Record<string, unknown> }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const allowed = ['title', 'content', 'type', 'link', 'is_active', 'is_dismissible',
                   'target_plans', 'starts_at', 'expires_at']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabaseAdmin()
    .from('announcements')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await requireAdmin(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Soft-delete: only deactivate
  const { error } = await supabaseAdmin()
    .from('announcements')
    .update({ is_active: false })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
