/**
 * GET /api/shopee/auth
 * Redireciona o usuário para a página de autorização OAuth da Shopee.
 * Requer sessão Supabase válida.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getShopeeAuthUrl } from '@/lib/shopee/auth'

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?redirect=/dashboard/integracoes', req.url))
  }

  try {
    console.error('[Shopee auth] iniciando para user:', user.id)
    const authUrl = getShopeeAuthUrl()
    console.error('[Shopee auth] redirecionando...')
    return NextResponse.redirect(authUrl)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Shopee auth] Erro ao gerar URL:', msg)
    const origin = new URL(req.url).origin
    return NextResponse.redirect(
      `${origin}/dashboard/integracoes?shopee_error=${encodeURIComponent(msg)}`
    )
  }
}
