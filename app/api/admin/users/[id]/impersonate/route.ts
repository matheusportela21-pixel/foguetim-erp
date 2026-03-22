/**
 * POST /api/admin/users/[id]/impersonate
 * Gera um magic link para impersonar um usuário.
 * Apenas super_admin pode impersonar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-guard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const { id } = await params
  const body = await req.json() as { reason?: string }
  const reason = body.reason || 'Impersonação administrativa'

  const db = supabaseAdmin()

  // Get target user email
  const { data: targetUser, error: userError } = await db
    .from('users')
    .select('email, name')
    .eq('id', id)
    .single()

  if (userError || !targetUser) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type: 'magiclink',
    email: targetUser.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.foguetim.com.br'}/dashboard`,
    },
  })

  if (linkError || !linkData) {
    return NextResponse.json(
      { error: linkError?.message ?? 'Erro ao gerar link' },
      { status: 500 },
    )
  }

  // Log impersonation
  await db.from('impersonation_logs').insert({
    actor_id:             guard.userId,
    actor_email:          '', // will be filled by the guard info
    impersonated_user_id: id,
    impersonated_email:   targetUser.email,
    reason,
  }).select()

  // Also log to activity_logs
  await db.from('activity_logs').insert({
    user_id:     guard.userId,
    action:      'admin.impersonate',
    category:    'admin',
    description: `Impersonou usuário ${targetUser.name} (${targetUser.email})`,
    metadata:    { target_user_id: id, target_email: targetUser.email, reason },
    visibility:  'admin',
  })

  return NextResponse.json({
    url: linkData.properties?.action_link ?? '',
    email: targetUser.email,
    name: targetUser.name,
  })
}
