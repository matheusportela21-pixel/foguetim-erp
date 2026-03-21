/**
 * GET /api/shopee/status
 * Retorna o status da conexão Shopee para o usuário autenticado.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getShopeeConnections } from '@/lib/shopee/auth'

export async function GET() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ connected: false }, { status: 401 })

  try {
    const connections = await getShopeeConnections(user.id)
    const primary = connections.find(c => c.is_primary) ?? connections[0]

    return NextResponse.json({
      connected:   connections.length > 0,
      shop_id:     primary ? Number(primary.ml_user_id) : null,
      shop_name:   primary?.ml_nickname ?? null,
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
  } catch {
    return NextResponse.json({ connected: false })
  }
}
