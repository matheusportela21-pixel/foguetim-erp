/**
 * GET  /api/shopee/connections — Lista conexões Shopee do usuário
 * DELETE /api/shopee/connections?id=<uuid> — Desconecta uma loja
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getShopeeConnections, disconnectShopeeById } from '@/lib/shopee/auth'

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
}

export async function GET() {
  const supabase = makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const connections = await getShopeeConnections(user.id)
  return NextResponse.json({
    connections: connections.map(c => ({
      id:            c.id,
      shop_id:       Number(c.ml_user_id),
      shop_name:     c.ml_nickname,
      account_label: c.account_label,
      is_primary:    c.is_primary,
      expires_at:    c.expires_at,
      connected:     c.connected,
    })),
  })
}

export async function DELETE(req: NextRequest) {
  const supabase = makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const connectionId = req.nextUrl.searchParams.get('id')
  if (!connectionId) {
    return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  }

  try {
    await disconnectShopeeById(user.id, connectionId)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
