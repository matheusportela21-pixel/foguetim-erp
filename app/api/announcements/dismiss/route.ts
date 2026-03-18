/**
 * POST /api/announcements/dismiss
 * Body: { announcement_id: string }
 * Registra que o usuário dispensou um aviso.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { announcement_id?: string }
  try {
    body = await req.json() as { announcement_id?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { announcement_id } = body
  if (!announcement_id || typeof announcement_id !== 'string') {
    return NextResponse.json({ error: 'announcement_id obrigatório' }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('dismissed_announcements')
    .upsert({ user_id: user.id, announcement_id }, { onConflict: 'user_id,announcement_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
