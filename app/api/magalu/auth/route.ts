/**
 * GET /api/magalu/auth
 * Redireciona o seller para a tela de login/consentimento do ID Magalu.
 * Gera um nonce CSRF armazenado em cookie httpOnly para validação no callback.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { getMagaluEnv, MAGALU_REDIRECT_URI } from '@/lib/magalu/config'

const MAGALU_LOGIN_URL = 'https://id.magalu.com/login'

const MAGALU_SCOPES = [
  'apiin:all',
  'open:order-order-seller:read',
  'open:order-delivery-seller:read',
  'open:order-delivery-seller:write',
  'open:order-invoice-seller:read',
  'open:portfolio-skus-seller:read',
  'open:portfolio-skus-seller:write',
  'open:portfolio-prices-seller:read',
  'open:portfolio-prices-seller:write',
  'open:portfolio-stocks-seller:read',
  'open:portfolio-stocks-seller:write',
].join(' ')

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const { origin } = new URL(req.url)
    return NextResponse.redirect(`${origin}/login?redirect=/dashboard/integracoes`)
  }

  const { clientId } = getMagaluEnv()

  // Gera nonce CSRF aleatório (32 bytes = 64 hex chars)
  const nonce = randomBytes(32).toString('hex')

  const params = new URLSearchParams({
    client_id:      clientId,
    redirect_uri:   MAGALU_REDIRECT_URI,
    scope:          MAGALU_SCOPES,
    response_type:  'code',
    choose_tenants: 'true',
    state:          nonce,
  })

  const authUrl = `${MAGALU_LOGIN_URL}?${params.toString()}`

  const response = NextResponse.redirect(authUrl)

  // Armazena nonce em cookie httpOnly — válido por 10 minutos
  response.cookies.set('magalu_oauth_state', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    path:     '/api/magalu/callback',
    maxAge:   600, // 10 min
    secure:   process.env.NODE_ENV === 'production',
  })

  return response
}
