/**
 * GET  /api/alerts/settings — get alert settings
 * PATCH /api/alerts/settings — update alert settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAlertSettings } from '@/lib/alerts/helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { dataOwnerId, error } = await requirePermission('settings:manage')
  if (error) return error
  const settings = await getAlertSettings(dataOwnerId)
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('settings:manage')
  if (authError) return authError

  const body = await req.json()
  const db = supabaseAdmin()

  await db.from('alert_settings').upsert({
    user_id: dataOwnerId,
    ...body,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true })
}
