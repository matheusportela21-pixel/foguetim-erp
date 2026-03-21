/**
 * POST /api/shopee/refresh
 * Renova manualmente o access_token Shopee para o usuário autenticado.
 * Normalmente o refresh é automático via getValidShopeeToken(),
 * mas este endpoint permite forçar manualmente (ex: botão "Sincronizar").
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getValidShopeeToken } from '@/lib/shopee/auth'

export async function POST() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const result = await getValidShopeeToken(user.id)
    if (!result) {
      return NextResponse.json({ error: 'Nenhuma conexão Shopee ativa' }, { status: 404 })
    }

    return NextResponse.json({ ok: true, shop_id: result.shopId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee refresh] Erro:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
