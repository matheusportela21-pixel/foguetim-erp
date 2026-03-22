import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-logger'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

    const { id } = await params
    const db = supabaseAdmin()

    const { data: user, error: fetchError } = await db
      .from('users')
      .select('email')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 })
    }

    const { error: unbanError } = await db.auth.admin.updateUserById(id, {
      ban_duration: 'none',
    })

    if (unbanError) {
      return NextResponse.json({ error: 'Erro ao desbloquear usuario' }, { status: 500 })
    }

    await logAdminAction({
      userId: guard.user.id,
      action: 'user_unblocked',
      category: 'admin',
      description: `Usuario ${user.email} desbloqueado`,
      metadata: { targetUserId: id, targetEmail: user.email },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
