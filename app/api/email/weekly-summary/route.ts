/**
 * POST /api/email/weekly-summary
 * Disparo manual do resumo semanal para o usuário autenticado.
 * Usado pelo botão de teste nas Configurações > Emails (opt-in).
 */
import { NextResponse }                   from 'next/server'
import { getAuthUser }                    from '@/lib/server-auth'
import { supabaseAdmin }                  from '@/lib/supabase-admin'
import { buildAndSendWeeklySummary }      from '@/lib/email/weekly-summary.helper'

export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin()
    .from('users')
    .select('email, name, email_prefs')
    .eq('id', user.id)
    .single()

  if (!profile?.email) {
    return NextResponse.json({ success: false, message: 'Email não encontrado na conta' })
  }

  const prefs = (profile.email_prefs ?? {}) as Record<string, boolean>
  if (!prefs.weekly_summary) {
    return NextResponse.json({
      success: false,
      message: 'Ative a preferência "Resumo semanal" antes de testar',
    })
  }

  const sent = await buildAndSendWeeklySummary({
    id:         user.id,
    email:      profile.email,
    sellerName: profile.name ?? 'Vendedor',
  })

  return NextResponse.json(
    sent
      ? { success: true,  message: 'Resumo semanal enviado com sucesso!' }
      : { success: false, message: 'Erro ao enviar. Verifique as configurações SMTP.' },
  )
}
