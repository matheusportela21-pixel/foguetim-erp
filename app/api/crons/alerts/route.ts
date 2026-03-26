/**
 * GET /api/crons/alerts
 * Cron job que roda a cada 30 minutos.
 * Busca todos os usuários com marketplace conectado e executa checks de alerta.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { runAlertChecks } from '@/lib/alerts/engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()

  // Get all unique user_ids with active marketplace connections
  const { data: connections } = await db
    .from('marketplace_connections')
    .select('user_id')
    .eq('connected', true)

  if (!connections || connections.length === 0) {
    return NextResponse.json({ message: 'No connected users', checked: 0 })
  }

  // Deduplicate user IDs
  const userIds = Array.from(new Set(connections.map((c: { user_id: string }) => c.user_id)))

  let checked = 0
  let errors = 0

  for (const userId of userIds) {
    try {
      await runAlertChecks(userId)
      checked++
    } catch (err) {
      errors++
      console.error(`[cron/alerts] Error for user ${userId}:`, err)
    }

    // Rate limit: small delay between users
    if (checked < userIds.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return NextResponse.json({ checked, errors, total: userIds.length })
}
