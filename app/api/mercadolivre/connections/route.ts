/**
 * GET    /api/mercadolivre/connections        — lista todas as contas ML conectadas
 * DELETE /api/mercadolivre/connections?id=xxx — desconecta uma conta específica
 * PATCH  /api/mercadolivre/connections?id=xxx — define como primária ou atualiza label
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getMLConnections,
  disconnectMLById,
  setMLPrimary,
} from '@/lib/mercadolivre'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getUser(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  return supabase.auth.getUser()
}

export async function GET(req: NextRequest) {
  const { data: { user } } = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connections = await getMLConnections(user.id)
  return NextResponse.json({
    connections: connections.map(c => ({
      id:            c.id,
      ml_user_id:    c.ml_user_id,
      ml_nickname:   c.ml_nickname,
      account_label: c.account_label,
      is_primary:    c.is_primary,
      expires_at:    c.expires_at,
      connected:     c.connected,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const { data: { user } } = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connectionId = new URL(req.url).searchParams.get('id')
  if (!connectionId) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  await disconnectMLById(user.id, connectionId)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { data: { user } } = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connectionId = new URL(req.url).searchParams.get('id')
  if (!connectionId) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  let body: { set_primary?: boolean; account_label?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.set_primary) {
    await setMLPrimary(user.id, connectionId)
  }

  if (typeof body.account_label === 'string') {
    const label = body.account_label.trim().slice(0, 50) || null
    await supabaseAdmin()
      .from('marketplace_connections')
      .update({ account_label: label, updated_at: new Date().toISOString() })
      .eq('id', connectionId)
      .eq('user_id', user.id)
  }

  return NextResponse.json({ success: true })
}
