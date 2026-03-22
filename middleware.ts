import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Domain routing ────────────────────────────────────────────────────────────

const PUBLIC_DOMAIN = 'foguetim.com.br'
const APP_DOMAIN    = 'app.foguetim.com.br'

const PUBLIC_ONLY_ROUTES = new Set([
  '/', '/blog', '/ajuda', '/planos', '/sobre', '/privacidade',
  '/termos', '/changelog', '/contato', '/integracoes',
])
const PUBLIC_ONLY_PREFIXES = ['/blog/', '/ajuda/', '/api/blog/', '/api/help/', '/api/changelog']
const APP_PREFIXES = [
  '/dashboard', '/admin',
  '/api/mercadolivre', '/api/armazem', '/api/admin', '/api/security',
  '/api/feedback', '/api/empresa', '/api/precificacao', '/api/user',
  '/api/cron', '/api/ai', '/api/webhooks',
]
const BOTH_DOMAINS = new Set(['/login', '/cadastro', '/registro', '/recuperar-senha', '/redefinir-senha', '/auth/callback'])
const SKIP_AUTH = new Set(['/auth/callback'])

function isPublicOnly(p: string) {
  return PUBLIC_ONLY_ROUTES.has(p) || PUBLIC_ONLY_PREFIXES.some(x => p.startsWith(x))
}
function isAppRoute(p: string) { return APP_PREFIXES.some(x => p.startsWith(x)) }

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''

  // ── Domain-based routing (only in production, not localhost / Vercel preview) ─
  const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.endsWith('.vercel.app')
  if (!isLocal) {
    const isOnPublicDomain = (hostname === PUBLIC_DOMAIN || hostname === `www.${PUBLIC_DOMAIN}`)
    const isOnAppDomain    = hostname === APP_DOMAIN

    // Public domain → app route → redirect
    if (isOnPublicDomain && isAppRoute(pathname)) {
      return NextResponse.redirect(
        new URL(`https://${APP_DOMAIN}${pathname}${request.nextUrl.search}`, request.url), 301,
      )
    }
    // App domain → public-only route → redirect (login/cadastro allowed on both)
    if (isOnAppDomain && isPublicOnly(pathname) && !BOTH_DOMAINS.has(pathname)) {
      return NextResponse.redirect(
        new URL(`https://www.${PUBLIC_DOMAIN}${pathname}${request.nextUrl.search}`, request.url), 301,
      )
    }
    // App domain root → dashboard
    if (isOnAppDomain && pathname === '/') {
      return NextResponse.redirect(new URL(`https://${APP_DOMAIN}/dashboard`, request.url), 302)
    }
  }

  // ── Auth guard ────────────────────────────────────────────────────────────

  // Skip auth for callback routes (OAuth, password reset)
  if (SKIP_AUTH.has(pathname)) {
    return NextResponse.next({ request })
  }

  // If Supabase is not configured, let everything through (dev mode with mock data)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url || url.includes('your-project-id')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll:  () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options))
      },
    },
  })

  // Refresh session (keeps auth token alive)
  const { data: { user } } = await supabase.auth.getUser()

  // ── Protect /admin/* ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Verify admin role via DB (service role not needed — just reading own profile)
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'foguetim_support'
    if (!isAdmin) {
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/dashboard'
      dashUrl.searchParams.set('error', 'sem_permissao')
      return NextResponse.redirect(dashUrl)
    }
  }

  // ── Protect /dashboard/publicidade (admin/foguetim_support only) ─────────
  if (pathname.startsWith('/dashboard/publicidade')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    const allowed = profile?.role === 'admin' || profile?.role === 'foguetim_support'
    if (!allowed) {
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashUrl)
    }
  }

  // ── Protect /dashboard/* ─────────────────────────────────────────────────
  if (!user && pathname.startsWith('/dashboard')) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from /login and /registro
  if (user && (pathname === '/login' || pathname === '/registro')) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    dashUrl.searchParams.delete('redirect')
    return NextResponse.redirect(dashUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
