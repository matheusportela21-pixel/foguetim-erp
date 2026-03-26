/**
 * GET /api/crons/weekly-report
 * Alternative cron entry-point for weekly reports.
 * Re-uses the existing buildAndSendWeeklySummary helper.
 *
 * Can be triggered by Vercel Cron or manually with CRON_SECRET.
 * The primary cron at /api/cron/weekly-summary also exists — both are valid.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { buildAndSendWeeklySummary }  from '@/lib/email/weekly-summary.helper'

export async function GET(req: NextRequest) {
  // ── Verify cron secret ──────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Get users with weekly_summary enabled ───────────────────────────────
  const { data: users, error } = await supabaseAdmin()
    .from('users')
    .select('id, email, name, email_prefs')
    .eq('email_prefs->>weekly_summary', 'true')

  if (error) {
    console.error('[crons/weekly-report] DB error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!users?.length) {
    return NextResponse.json({ message: 'No users with weekly report enabled', sent: 0 })
  }

  // ── Send to each user ──────────────────────────────────────────────────
  const results = await Promise.allSettled(
    users.map(u => buildAndSendWeeklySummary({
      id:         u.id,
      email:      u.email ?? '',
      sellerName: (u.name as string) ?? 'Vendedor',
    })),
  )

  const sent   = results.filter(r => r.status === 'fulfilled' && r.value === true).length
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false)).length

  return NextResponse.json({ sent, failed, total: users.length })
}
