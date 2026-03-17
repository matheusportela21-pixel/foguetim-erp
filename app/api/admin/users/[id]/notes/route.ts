/**
 * GET  /api/admin/users/[id]/notes — list internal notes
 * POST /api/admin/users/[id]/notes — add note
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const { data, error } = await supabaseAdmin()
      .from('company_notes')
      .select('*, author:author_id(name, email)')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ notes: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notes: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const { note } = await req.json() as { note: string }
    if (!note?.trim()) return NextResponse.json({ error: 'note é obrigatório' }, { status: 400 })

    const { data, error } = await supabaseAdmin()
      .from('company_notes')
      .insert({ user_id: params.id, author_id: guard.userId, note: note.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Log audit
    await Promise.resolve(
      supabaseAdmin().from('admin_audit_logs').insert({
        actor_id:    guard.userId,
        actor_role:  guard.role,
        action:      'add_note',
        target_type: 'user',
        target_id:   params.id,
        description: `Nota adicionada ao usuário ${params.id}`,
      })
    ).catch(() => {/* non-blocking */})

    return NextResponse.json({ note: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
