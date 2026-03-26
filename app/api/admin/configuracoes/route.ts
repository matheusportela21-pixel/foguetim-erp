/**
 * GET/PATCH /api/admin/configuracoes
 * Read/write system_settings table.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_KEYS = [
  'maintenance_mode',
  'max_users_explorador',
  'max_users_piloto',
  'max_users_comandante',
  'max_users_almirante',
  'max_users_enterprise',
  'default_trial_days',
  'email_notifications',
] as const

const DEFAULTS: Record<string, unknown> = {
  maintenance_mode: false,
  max_users_explorador: 1,
  max_users_piloto: 3,
  max_users_comandante: 5,
  max_users_almirante: 10,
  max_users_enterprise: 50,
  default_trial_days: 7,
  email_notifications: true,
}

/* ---- GET: Read all settings -------------------------------------------- */
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('system_settings')
    .select('key, value')

  if (error) {
    // Table may not exist yet - return defaults
    return NextResponse.json(DEFAULTS)
  }

  const result: Record<string, unknown> = { ...DEFAULTS }
  for (const row of data ?? []) {
    if (ALLOWED_KEYS.includes(row.key as typeof ALLOWED_KEYS[number])) {
      try {
        result[row.key] = JSON.parse(row.value)
      } catch {
        result[row.key] = row.value
      }
    }
  }

  return NextResponse.json(result)
}

/* ---- PATCH: Update settings -------------------------------------------- */
export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const body = await req.json()
  const db = supabaseAdmin()

  const updates: { key: string; value: string; updated_at: string }[] = []
  const now = new Date().toISOString()

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      updates.push({
        key,
        value: JSON.stringify(body[key]),
        updated_at: now,
      })
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nenhuma configuracao valida enviada' }, { status: 400 })
  }

  // Upsert each setting
  for (const update of updates) {
    const { error } = await db
      .from('system_settings')
      .upsert(update, { onConflict: 'key' })

    if (error) {
      return NextResponse.json(
        { error: `Erro ao salvar ${update.key}: ${error.message}` },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ ok: true })
}
