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
    const { confirm_email } = await request.json()

    if (!confirm_email) {
      return NextResponse.json({ error: 'Email de confirmacao e obrigatorio' }, { status: 400 })
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

    if (confirm_email !== user.email) {
      return NextResponse.json({ error: 'Email de confirmacao nao confere' }, { status: 400 })
    }

    const { error: deleteDbError } = await db
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteDbError) {
      return NextResponse.json({ error: 'Erro ao remover dados do usuario' }, { status: 500 })
    }

    const { error: deleteAuthError } = await db.auth.admin.deleteUser(id)

    if (deleteAuthError) {
      return NextResponse.json({ error: 'Erro ao remover conta do usuario' }, { status: 500 })
    }

    await logAdminAction({
      userId: guard.user.id,
      action: 'user_deleted',
      category: 'admin',
      description: `Usuario ${user.email} deletado permanentemente`,
      metadata: { targetUserId: id, targetEmail: user.email },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
