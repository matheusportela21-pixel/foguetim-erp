/**
 * GET /api/cron/weekly-summary
 * Chamado pelo Vercel Cron todo domingo às 08:00 BRT (11:00 UTC).
 * Envia o resumo semanal para todos os usuários com weekly_summary = true.
 *
 * Autenticação: header Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse }  from 'next/server'
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { buildAndSendWeeklySummary }  from '@/lib/email/weekly-summary.helper'

export async function GET(req: NextRequest) {
  // ── Verificar secret ────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // ── Buscar usuários com weekly_summary ativo ───────────────────────────
  const { data: users, error } = await supabaseAdmin()
    .from('users')
    .select('id, email, name, email_prefs')
    .eq('email_prefs->>weekly_summary', 'true')

  if (error) {
    console.error('[cron/weekly-summary] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = users ?? []
  console.log(`[cron/weekly-summary] Found ${list.length} user(s) with weekly_summary enabled`)

  // ── Enviar para cada usuário ────────────────────────────────────────────
  const results = await Promise.allSettled(
    list.map(u => buildAndSendWeeklySummary({
      id:         u.id,
      email:      u.email ?? '',
      sellerName: (u.name as string) ?? 'Vendedor',
    })),
  )

  const sent   = results.filter(r => r.status === 'fulfilled' && r.value  === true).length
  const failed = results.filter(r => r.status === 'rejected'  || r.value === false).length

  console.log(`[cron/weekly-summary] Done — sent: ${sent}, failed: ${failed}`)

  return NextResponse.json({ sent, failed, total: list.length })
}
