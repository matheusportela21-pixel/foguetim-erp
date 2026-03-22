/**
 * GET /api/magalu/callback
 * OAuth callback do Magalu. O seller autoriza via Portal Magalu,
 * que redireciona pra cá com code, state (CNPJ), email e seller_id.
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
  const code     = searchParams.get('code')
  const cnpj     = searchParams.get('state')    // state = CNPJ do seller
  const email    = searchParams.get('email')
  const sellerId = searchParams.get('seller_id')
  const error    = searchParams.get('error')

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

  console.log('[Magalu callback] user:', user.id, 'seller_id:', sellerId, 'cnpj:', cnpj, 'email:', email)

  try {
    // 1. Trocar code por tokens (expira em 10 min!)
    const tokens = await magaluExchangeCode(code)
    console.log('[Magalu callback] token exchange OK — expires_in:', tokens.expires_in)

    // 2. Salvar no banco
    const sid   = sellerId ?? 'unknown'
    const alias = email ?? `Seller ${sid}`
    await saveMagaluConnection(user.id, tokens, sid, alias)
    console.log('[Magalu callback] saveMagaluConnection OK')

    // 3. Notificação de sucesso
    await createNotification({
      userId:    user.id,
      title:     'Magalu conectado!',
      message:   `Sua conta Magalu (${alias}) foi conectada com sucesso ao Foguetim ERP.`,
      type:      'success',
      category:  'integration',
      actionUrl: '/dashboard/integracoes',
    })

    return redirect(`/dashboard/integracoes?magalu_connected=true`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Magalu callback] ERRO:', message)
    return redirect(`/dashboard/integracoes?magalu_error=${encodeURIComponent(message)}`)
  }
}
