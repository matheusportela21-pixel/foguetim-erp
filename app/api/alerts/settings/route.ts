/**
 * GET  /api/alerts/settings — get alert settings
 * PATCH /api/alerts/settings — update alert settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAlertSettings } from '@/lib/alerts/helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const settings = await getAlertSettings(user.id)
  return NextResponse.json({ settings })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const db = supabaseAdmin()

  await db.from('alert_settings').upsert({
    user_id: user.id,
    ...body,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.json({ success: true })
}
