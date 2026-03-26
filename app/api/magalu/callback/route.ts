/**
 * GET /api/magalu/callback
 * OAuth callback do Magalu. O ID Magalu redireciona pra cá com code e state.
 *
 * O code expira em 10 minutos — trocar imediatamente!
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { magaluExchangeCode, saveMagaluConnection } from '@/lib/magalu/auth'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirect = (path: string) => NextResponse.redirect(`${origin}${path}`)

  if (error) {
    console.warn('[Magalu callback] OAuth erro:', error)
    return redirect('/dashboard/integracoes?magalu_error=cancelled')
  }

  if (!code) {
    console.error('[Magalu callback] code ausente')
    return redirect('/dashboard/integracoes?magalu_error=no_code')
  }

  // Autenticar usuário via Supabase session
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[Magalu callback] Usuário não autenticado')
    return redirect('/login?redirect=/dashboard/integracoes')
  }

  // Validar CSRF state
  const savedState = cookieStore.get('magalu_oauth_state')?.value
  if (savedState && state && savedState !== state) {
    console.error('[Magalu callback] CSRF state mismatch')
    return redirect('/dashboard/integracoes?magalu_error=csrf_mismatch')
  }

  try {
    // 1. Trocar code por tokens (expira em 10 min!)
    const tokens = await magaluExchangeCode(code)

    // 2. Extrair seller_id do scope ou usar um placeholder
    // O ID Magalu retorna o tenant/seller info nos tokens
    // Por enquanto usar um ID baseado no user até conseguirmos extrair do token
    const sellerId = tokens.scope?.match(/tenant:(\S+)/)?.[1] ?? `magalu_${user.id.substring(0, 8)}`
    const alias    = `Seller Magalu`

    await saveMagaluConnection(user.id, tokens, sellerId, alias)

    // 3. Notificação de sucesso
    await createNotification({
      userId:    user.id,
      title:     'Magalu conectado!',
      message:   `Sua conta Magalu foi conectada com sucesso ao Foguetim ERP.`,
      type:      'success',
      category:  'integration',
      actionUrl: '/dashboard/integracoes',
    })

    // Limpar cookie CSRF
    const res = redirect('/dashboard/integracoes?magalu_connected=true')
    res.cookies.delete('magalu_oauth_state')
    return res
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Magalu callback] ERRO:', message)
    return redirect(`/dashboard/integracoes?magalu_error=${encodeURIComponent(message)}`)
  }
}
