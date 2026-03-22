import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { logAdminAction } from '@/lib/admin-logger'
import { sendEmail } from '@/lib/email/email.service'

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

    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: {
        redirectTo: 'https://app.foguetim.com.br/redefinir-senha',
      },
    })

    if (linkError || !linkData) {
      return NextResponse.json({ error: 'Erro ao gerar link de recuperacao' }, { status: 500 })
    }

    const recoveryLink = linkData.properties?.action_link ?? ''

    await sendEmail({
      to: user.email,
      subject: 'Redefinicao de senha - Foguetim ERP',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e1a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #00d4ff; font-size: 24px; margin: 0;">Foguetim ERP</h1>
          </div>
          <div style="background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 32px;">
            <h2 style="color: #f1f5f9; font-size: 20px; margin: 0 0 16px;">Redefinicao de Senha</h2>
            <p style="color: #94a3b8; line-height: 1.6; margin: 0 0 24px;">
              Um administrador solicitou a redefinicao da sua senha. Clique no botao abaixo para criar uma nova senha.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${recoveryLink}" style="display: inline-block; background: linear-gradient(135deg, #00d4ff, #a855f7); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Redefinir Senha
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
              Se voce nao solicitou esta alteracao, entre em contato com o suporte imediatamente.
              Este link expira em 24 horas.
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <p style="color: #475569; font-size: 12px; margin: 0;">&copy; Foguetim ERP - Todos os direitos reservados</p>
          </div>
        </div>
      `,
    })

    await logAdminAction({
      userId: guard.user.id,
      action: 'password_reset_sent',
      category: 'admin',
      description: `Link de redefinicao de senha enviado para ${user.email}`,
      metadata: { targetUserId: id, targetEmail: user.email },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
