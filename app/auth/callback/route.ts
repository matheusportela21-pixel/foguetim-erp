/**
 * GET /auth/callback
 * Handles the OAuth PKCE callback from Supabase.
 * Exchanges the code for a session, then redirects to /dashboard.
 *
 * IMPORTANT: This route MUST run on the app domain (app.foguetim.com.br)
 * so the code_verifier cookie is accessible (same domain that initiated OAuth).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const APP_URL = 'https://app.foguetim.com.br'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')

  // Diagnostic logs (Vercel → Functions logs)
  console.log('[auth/callback] host:', request.headers.get('host'))
  console.log('[auth/callback] code:', code ? 'presente' : 'ausente')
  console.log('[auth/callback] error param:', error ?? 'nenhum')

  // Se Supabase retornou erro direto
  if (error) {
    const desc = searchParams.get('error_description') ?? 'Erro na autenticação'
    console.error('[auth/callback] Supabase error:', error, desc)
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(desc)}`)
  }

  if (!code) {
    console.error('[auth/callback] code ausente na query string')
    return NextResponse.redirect(`${APP_URL}/login?error=no_code`)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const cookieStore = await cookies()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  console.log('[auth/callback] exchange result:', exchangeError ? exchangeError.message : 'sucesso')

  if (exchangeError) {
    console.error('[auth/callback] exchange error:', exchangeError)
    return NextResponse.redirect(`${APP_URL}/login?error=${encodeURIComponent(exchangeError.message)}`)
  }

  // Verificar/criar perfil (primeiro acesso Google OAuth)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      try {
        const { supabaseAdmin } = await import('@/lib/supabase-admin')
        const db = supabaseAdmin()
        const meta = user.user_metadata ?? {}
        const name = meta.full_name || meta.name || user.email?.split('@')[0] || ''

        await db.from('users').insert({
          id:      user.id,
          email:   user.email,
          name,
          company: name,
          role:    'operador',
          plan:    'explorador',
        })

        await db.from('user_onboarding').insert({
          user_id:         user.id,
          completed:       false,
          dismissed:       false,
          current_step:    0,
          steps_completed: {},
        })

        await db.from('activity_logs').insert({
          user_id:     user.id,
          action:      'google_auth_completed',
          category:    'auth',
          description: 'Conta criada via Google OAuth',
          metadata:    { provider: 'google', email: user.email, name },
        })

        console.log('[auth/callback] novo perfil criado para:', user.email)
      } catch (e) {
        console.error('[auth/callback] erro ao criar perfil:', e)
        // Não bloqueia — deixa o usuário entrar mesmo se a criação falhar
      }
    } else {
      // Usuário existente — registra login
      void supabase.from('activity_logs').insert({
        user_id:     user.id,
        action:      'login',
        category:    'auth',
        description: 'Login via Google OAuth',
        metadata:    { provider: 'google' },
      })
    }
  }

  const redirectTo = next.startsWith('/') ? `${APP_URL}${next}` : `${APP_URL}/dashboard`
  console.log('[auth/callback] redirecionando para:', redirectTo)
  return NextResponse.redirect(redirectTo)
}
