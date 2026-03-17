/**
 * PATCH /api/user/email-prefs
 * Atualiza uma chave específica de email_prefs do usuário.
 *
 * Body: { key: string, value: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ALLOWED_KEYS = [
  'new_order',
  'new_question',
  'new_claim',
  'claim_urgent',
  'new_message',
  'shipping_update',
  'weekly_summary',
  'promo_alerts',
] as const

type PrefKey = typeof ALLOWED_KEYS[number]

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { key, value } = body as { key?: unknown; value?: unknown }

  if (typeof key !== 'string' || !ALLOWED_KEYS.includes(key as PrefKey)) {
    return NextResponse.json({ error: 'Chave inválida' }, { status: 400 })
  }
  if (typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Valor deve ser boolean' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Ler prefs atuais e fazer merge
  const { data: row, error: fetchErr } = await db
    .from('users')
    .select('email_prefs')
    .eq('id', user.id)
    .single()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const current = (row?.email_prefs ?? {}) as Record<string, boolean>
  const updated  = { ...current, [key]: value }

  const { error: updateErr } = await db
    .from('users')
    .update({ email_prefs: updated })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email_prefs: updated })
}

export async function GET(_req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('users')
    .select('email_prefs')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ email_prefs: data?.email_prefs ?? {} })
}
