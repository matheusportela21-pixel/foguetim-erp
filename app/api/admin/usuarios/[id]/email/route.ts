import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-logger'
import { sendEmail } from '@/lib/email/email.service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

    const { id } = await params
    const { subject, body } = await request.json()

    if (!subject || !body) {
      return NextResponse.json({ error: 'Assunto e corpo do email sao obrigatorios' }, { status: 400 })
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

    await sendEmail({
      to: user.email,
      subject,
      html: body,
    })

    await logAdminAction({
      userId: guard.userId!,
      action: 'admin_email_sent',
      category: 'admin',
      description: `Email enviado para ${user.email}: ${subject}`,
      metadata: { targetUserId: id, targetEmail: user.email, subject },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
