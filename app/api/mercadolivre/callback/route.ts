/**
 * GET /api/mercadolivre/callback
 *
 * Endpoint server-side que o Mercado Livre redireciona após o OAuth.
 * ML_REDIRECT_URI deve apontar para: https://foguetim.com.br/api/mercadolivre/callback
 *
 * Fluxo:
 *   1. Lê ?code e ?error dos query params
 *   2. Autentica o usuário via cookies de sessão Supabase
 *   3. Troca o code por tokens chamando a API do ML
 *   4. Busca nickname do usuário ML
 *   5. Salva tudo em marketplace_connections com o admin client (bypassa RLS)
 *   6. Redireciona para /dashboard/integracoes?connected=true
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { exchangeCode, saveConnection } from '@/lib/mercadolivre'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  const redirect = (path: string) => NextResponse.redirect(`${origin}${path}`)

  // ML cancelled or denied
  if (error) {
    console.warn('[ML callback] OAuth error from ML:', error)
    return redirect('/dashboard/integracoes?ml_error=cancelled')
  }

  if (!code) {
    console.error('[ML callback] No code in query params')
    return redirect('/dashboard/integracoes?ml_error=no_code')
  }

  // Authenticate user from session cookies
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[ML callback] No authenticated user — redirecting to login')
    return redirect('/login?redirect=/dashboard/integracoes')
  }

  console.log('[ML callback] user:', user.id, '— exchanging code...')

  try {
    // 1. Exchange code → tokens
    const tokens = await exchangeCode(code)
    console.log('[ML callback] token exchange OK — ml_user_id:', tokens.user_id)

    // 2. Fetch ML user info (nickname)
    const meRes = await fetch(`https://api.mercadolibre.com/users/${tokens.user_id}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const me = await meRes.json()
    const nickname = me.nickname ?? String(tokens.user_id)
    console.log('[ML callback] ML user nickname:', nickname)

    // 3. Save to DB using admin client (bypasses RLS)
    await saveConnection(user.id, tokens, nickname)
    console.log('[ML callback] saveConnection OK')

    // 4. Notificação de conexão bem-sucedida
    await createNotification({
      userId:    user.id,
      title:     'Mercado Livre conectado!',
      message:   `Sua conta ${nickname} foi conectada com sucesso ao Foguetim ERP.`,
      type:      'success',
      category:  'integration',
      actionUrl: '/dashboard/integracoes',
    })

    return redirect(`/dashboard/integracoes?connected=true&nickname=${encodeURIComponent(nickname)}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ML callback] ERROR:', message)
    return redirect(`/dashboard/integracoes?ml_error=${encodeURIComponent(message)}`)
  }
}
