/**
 * GET /auth/callback
 * Handles the OAuth callback from Supabase.
 * Exchanges the PKCE code for a session, then redirects to /dashboard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code  = searchParams.get('code')
  const next  = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')

  // If Supabase returned an error
  if (error) {
    const errorDesc = searchParams.get('error_description') ?? 'Erro na autenticação'
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('error', errorDesc)
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      // Ensure profile exists for Google OAuth users
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Check if profile exists, create if not (for first Google login)
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // Use admin client to create profile (bypasses RLS)
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
        } else {
          // Existing user — log login
          await supabase.from('activity_logs').insert({
            user_id:     user.id,
            action:      'login',
            category:    'auth',
            description: 'Login via Google OAuth',
            metadata:    { provider: 'google' },
          })
        }
      }

      // Determine redirect URL
      const isProduction = !request.headers.get('host')?.includes('localhost')
      const redirectUrl = isProduction
        ? `https://app.foguetim.com.br${next}`
        : `${origin}${next}`

      return NextResponse.redirect(redirectUrl)
    }
  }

  // Fallback: redirect to login with error
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('error', 'Falha na autenticação. Tente novamente.')
  return NextResponse.redirect(loginUrl)
}
