import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Domain routing ────────────────────────────────────────────────────────────

const PUBLIC_DOMAIN = 'foguetim.com.br'
const APP_DOMAIN    = 'app.foguetim.com.br'

// Rotas que vivem exclusivamente no domínio app (app.foguetim.com.br)
const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/admin',
  '/login',
  '/cadastro',
  '/registro',
  '/recuperar-senha',
  '/redefinir-senha',
  '/auth',
  '/api',
]

// Rotas que vivem exclusivamente no domínio www (www.foguetim.com.br)
const WWW_EXACT_ROUTES = new Set([
  '/', '/blog', '/ajuda', '/planos', '/sobre', '/privacidade',
  '/termos', '/changelog', '/contato', '/integracoes',
])
const WWW_PREFIXES = ['/blog/', '/ajuda/', '/api/blog/', '/api/help/', '/api/changelog']

// Rotas que bypassam a verificação de auth (OAuth callback)
const SKIP_AUTH = new Set(['/auth/callback'])

function isAppRoute(p: string) {
  return APP_ROUTE_PREFIXES.some(prefix => p === prefix || p.startsWith(prefix + '/') || p.startsWith(prefix + '?'))
}

function isWwwRoute(p: string) {
  return WWW_EXACT_ROUTES.has(p) || WWW_PREFIXES.some(x => p.startsWith(x))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''
  const search   = request.nextUrl.search ?? ''

  // ── Domain-based routing (produção apenas — não localhost / Vercel preview) ─
  const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.endsWith('.vercel.app')

  if (!isLocal) {
    const isWww = hostname === PUBLIC_DOMAIN || hostname === `www.${PUBLIC_DOMAIN}`
    const isApp = hostname === APP_DOMAIN

    // www + rota de app → redirect pro app
    if (isWww && isAppRoute(pathname)) {
      return NextResponse.redirect(
        new URL(`https://${APP_DOMAIN}${pathname}${search}`, request.url), 301,
      )
    }

    // app + rota do www → redirect pro www (exceto /auth/callback)
    if (isApp && isWwwRoute(pathname)) {
      return NextResponse.redirect(
        new URL(`https://www.${PUBLIC_DOMAIN}${pathname}${search}`, request.url), 301,
      )
    }

    // app root → dashboard
    if (isApp && pathname === '/') {
      return NextResponse.redirect(new URL(`https://${APP_DOMAIN}/dashboard`, request.url), 302)
    }
  }

  // ── Auth guard ────────────────────────────────────────────────────────────

  // Skip auth para OAuth callback (PKCE code exchange)
  if (SKIP_AUTH.has(pathname)) {
    return NextResponse.next({ request })
  }

  // Se Supabase não está configurado, deixa passar (dev sem env)
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

  // Refresh session (mantém token vivo)
  const { data: { user } } = await supabase.auth.getUser()

  // ── Protect /admin/* ──────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
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

  // Redirect usuários autenticados fora do login/registro
  if (user && (pathname === '/login' || pathname === '/cadastro' || pathname === '/registro')) {
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
