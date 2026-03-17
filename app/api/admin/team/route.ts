/**
 * GET  /api/admin/team  — list foguetim_team members
 * POST /api/admin/team  — add/invite a team member
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET() {
  const guard = await requireAdmin()
  if (guard) return guard

  try {
    const { data, error } = await supabaseAdmin()
      .from('foguetim_team')
      .select('*, invited_by_user:invited_by(name, email)')
      .order('created_at', { ascending: true })

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') return NextResponse.json({ team: [] })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (guard) return guard

  try {
    const body = await req.json() as {
      email: string
      name:  string
      role:  string
      notes?: string
    }

    if (!body.email || !body.role) {
      return NextResponse.json({ error: 'email e role são obrigatórios' }, { status: 400 })
    }

    // Find user by email
    const { data: user } = await supabaseAdmin()
      .from('users')
      .select('id, email, name')
      .eq('email', body.email.toLowerCase().trim())
      .single()

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado com esse e-mail' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin()
      .from('foguetim_team')
      .upsert({
        user_id:  user.id,
        email:    user.email,
        name:     body.name || user.name || '',
        role:     body.role,
        notes:    body.notes ?? null,
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ member: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
