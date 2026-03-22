import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-logger'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

    const { id } = await params
    const { reason } = await request.json()

    if (!reason) {
      return NextResponse.json({ error: 'Motivo do bloqueio e obrigatorio' }, { status: 400 })
    }

    const db = supabaseAdmin()

    const { data: user, error: fetchError } = await db
      .from('users')
      .select('email')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    const { error: banError } = await db.auth.admin.updateUserById(id, {
      ban_duration: '876000h',
    })

    if (banError) {
      return NextResponse.json({ error: 'Erro ao bloquear usuario' }, { status: 500 })
    }

    await logAdminAction({
      userId: guard.user.id,
      action: 'user_blocked',
      category: 'admin',
      description: `Usuario ${user.email} bloqueado. Motivo: ${reason}`,
      metadata: { targetUserId: id, targetEmail: user.email, reason },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
