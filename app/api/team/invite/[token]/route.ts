/**
 * GET /api/team/invite/[token] — verify invite (public, no auth required)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = supabaseAdmin()

  const { data: invite } = await db
    .from('team_invites')
    .select('id, email, name, role, expires_at, status, owner_id')
    .eq('token', token)
    .maybeSingle()

  if (!invite) {
    return NextResponse.json({ error: 'Convite não encontrado', valid: false }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Convite já foi usado ou revogado', valid: false }, { status: 410 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Convite expirado', valid: false }, { status: 410 })
  }

  // Fetch owner info
  const { data: owner } = await db
    .from('users')
    .select('name, company')
    .eq('id', invite.owner_id)
    .single()

  return NextResponse.json({
    valid: true,
    invite: {
      email:       invite.email,
      name:        invite.name,
      role:        invite.role,
      ownerName:   owner?.name ?? 'Administrador',
      companyName: owner?.company ?? 'Empresa',
      expiresAt:   invite.expires_at,
    },
  })
}
