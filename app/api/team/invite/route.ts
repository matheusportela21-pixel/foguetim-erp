/**
 * POST /api/team/invite — send team invite
 * Body: { email, name?, role }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email/email.service'
import { getPlanLimits } from '@/lib/plan-limits'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json() as { email: string; name?: string; role: string }
  if (!body.email || !body.role) {
    return NextResponse.json({ error: 'Email e cargo são obrigatórios' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Check: user must be owner (not a team member)
  const { data: memberCheck } = await db
    .from('team_members')
    .select('id')
    .eq('member_user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (memberCheck) {
    return NextResponse.json({ error: 'Apenas o dono da conta pode convidar membros' }, { status: 403 })
  }

  // Check plan limits
  const { data: profile } = await db.from('users').select('plan, name, company').eq('id', user.id).single()
  const limits = getPlanLimits(profile?.plan)
  const { count: currentCount } = await db
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id)
    .in('status', ['active', 'pending'])

  if ((currentCount ?? 0) >= limits.maxTeamMembers) {
    return NextResponse.json({
      error: `Seu plano ${limits.label} permite até ${limits.maxTeamMembers} membros. Faça upgrade para adicionar mais.`,
      upgrade: true,
    }, { status: 403 })
  }

  // Check duplicate
  const { data: existing } = await db
    .from('team_invites')
    .select('id')
    .eq('owner_id', user.id)
    .eq('email', body.email)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Já existe um convite pendente para este email' }, { status: 409 })
  }

  // Generate token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Create invite
  const { error: insertError } = await db.from('team_invites').insert({
    owner_id:   user.id,
    email:      body.email,
    name:       body.name ?? null,
    role:       body.role,
    permissions: {},
    token,
    invited_by: user.id,
    expires_at: expiresAt,
    status:     'pending',
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Also create pending team_member
  await db.from('team_members').upsert({
    owner_id:   user.id,
    email:      body.email,
    name:       body.name ?? body.email.split('@')[0],
    role:       body.role,
    permissions: {},
    status:     'pending',
    invited_by: user.id,
    invited_at: new Date().toISOString(),
  }, { onConflict: 'owner_id,email' })

  // Send email
  const inviteUrl = `https://app.foguetim.com.br/convite/${token}`
  const ownerName = profile?.name ?? 'O administrador'
  const companyName = profile?.company ?? 'sua empresa'

  await sendEmail({
    to: body.email,
    subject: `[Foguetim ERP] Convite para gerenciar ${companyName}`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0f172a; margin: 0;">Foguetim ERP</h2>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Olá ${body.name ?? ''},
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          <strong>${ownerName}</strong> convidou você para a equipe da <strong>${companyName}</strong> no Foguetim ERP.
        </p>
        <p style="color: #64748b; font-size: 14px;">
          Seu cargo: <strong>${body.role}</strong>
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Aceitar convite
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          Este convite expira em 7 dias.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">
          Foguetim ERP — Gestão de marketplace simplificada
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, message: `Convite enviado para ${body.email}` })
}
