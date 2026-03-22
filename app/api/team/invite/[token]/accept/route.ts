/**
 * POST /api/team/invite/[token]/accept — accept invite
 * Body: { email, password, name? } — for new accounts
 * Or: authenticated user accepts directly
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthUser } from '@/lib/server-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = supabaseAdmin()

  // Validate invite
  const { data: invite } = await db
    .from('team_invites')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: 'Convite inválido ou já utilizado' }, { status: 400 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    await db.from('team_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Convite expirado' }, { status: 410 })
  }

  const body = await req.json().catch(() => ({})) as { email?: string; password?: string; name?: string }

  // Try to get authenticated user first
  let userId: string | null = null
  const authUser = await getAuthUser()

  if (authUser) {
    // Already logged in — just accept
    userId = authUser.id
  } else if (body.email && body.password) {
    // Try to sign in first
    const { data: signIn } = await db.auth.admin.listUsers()
    const existingUser = signIn.users.find(u => u.email === body.email)

    if (existingUser) {
      // Existing user — they should log in through the UI
      userId = existingUser.id
    } else {
      // Create new account
      const { data: newUser, error: createError } = await db.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: { full_name: body.name ?? invite.name ?? '' },
      })

      if (createError || !newUser.user) {
        return NextResponse.json({ error: createError?.message ?? 'Erro ao criar conta' }, { status: 500 })
      }

      userId = newUser.user.id

      // Create user profile
      await db.from('users').insert({
        id:    userId,
        email: body.email,
        name:  body.name ?? invite.name ?? body.email.split('@')[0],
        role:  invite.role,
        plan:  'explorador',
      })

      await db.from('user_onboarding').insert({
        user_id: userId, completed: true, dismissed: true, current_step: 7, steps_completed: {},
      })
    }
  } else {
    return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  }

  // Accept the invite
  const now = new Date().toISOString()

  await db.from('team_invites')
    .update({ status: 'accepted', accepted_at: now })
    .eq('id', invite.id)

  // Update team_member
  await db.from('team_members')
    .update({
      member_user_id: userId,
      status: 'active',
      accepted_at: now,
      updated_at: now,
    })
    .eq('owner_id', invite.owner_id)
    .eq('email', invite.email)

  // Log activity
  await db.from('activity_logs').insert({
    user_id:     userId,
    action:      'team_invite_accepted',
    category:    'auth',
    description: `Aceitou convite para equipe como ${invite.role}`,
    metadata:    { owner_id: invite.owner_id, role: invite.role },
  })

  return NextResponse.json({
    success: true,
    message: 'Convite aceito! Redirecionando...',
    redirect: '/dashboard',
  })
}
