/**
 * GET /api/mercadolivre/auth
 * Redirects the user to Mercado Livre authorization page.
 * Gera um nonce CSRF armazenado em cookie httpOnly para validação no callback.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { getAuthorizationUrl } from '@/lib/mercadolivre'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Gera nonce CSRF aleatório (32 bytes = 64 hex chars)
  const nonce = randomBytes(32).toString('hex')

  const authUrl = getAuthorizationUrl(nonce)
  const response = NextResponse.redirect(authUrl)

  // Armazena nonce em cookie httpOnly — válido por 10 minutos
  response.cookies.set('ml_oauth_state', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/api/mercadolivre/callback',
    maxAge:   600, // 10 min
    secure:   process.env.NODE_ENV === 'production',
  })

  return response
}
