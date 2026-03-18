/**
 * GET  /api/user/print-prefs  — retorna preferências de impressão
 * PATCH /api/user/print-prefs — atualiza preferências de impressão
 *
 * Body (PATCH): { format?: 'pdf'|'zpl2', label_size?: string, auto_print?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface PrintPrefs {
  format:      'pdf' | 'zpl2'
  label_size:  string
  auto_print:  boolean
}

const DEFAULTS: PrintPrefs = {
  format:     'pdf',
  label_size: '100x150',
  auto_print: false,
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin()
    .from('users')
    .select('print_prefs')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ print_prefs: { ...DEFAULTS, ...(data?.print_prefs ?? {}) } })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Partial<PrintPrefs>
  try {
    body = await req.json() as Partial<PrintPrefs>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate fields
  if (body.format && !['pdf', 'zpl2'].includes(body.format)) {
    return NextResponse.json({ error: 'format deve ser pdf ou zpl2' }, { status: 400 })
  }
  if (body.auto_print !== undefined && typeof body.auto_print !== 'boolean') {
    return NextResponse.json({ error: 'auto_print deve ser boolean' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: row, error: fetchErr } = await db
    .from('users')
    .select('print_prefs')
    .eq('id', user.id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const current  = { ...DEFAULTS, ...(row?.print_prefs ?? {}) } as PrintPrefs
  const updated: PrintPrefs = {
    format:     body.format     ?? current.format,
    label_size: body.label_size ?? current.label_size,
    auto_print: body.auto_print ?? current.auto_print,
  }

  const { error: updateErr } = await db
    .from('users')
    .update({ print_prefs: updated })
    .eq('id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, print_prefs: updated })
}
