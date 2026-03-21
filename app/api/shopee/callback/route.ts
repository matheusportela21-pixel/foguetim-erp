/**
 * GET /api/shopee/callback
 *
 * Endpoint que a Shopee redireciona após autorização OAuth.
 * URL registrada no Shopee Partner Portal: https://app.foguetim.com.br/api/shopee/callback
 *
 * Fluxo:
 *   1. Lê ?code e ?shop_id dos query params
 *   2. Autentica o usuário via cookies de sessão Supabase
 *   3. Troca o code por access_token + refresh_token
 *   4. Busca info da loja (nome) via get_shop_info
 *   5. Salva em marketplace_connections
 *   6. Redireciona para /dashboard/integracoes?shopee_connected=true
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { shopeeExchangeCode, saveShopeeConnection } from '@/lib/shopee/auth'
import { shopeeGet } from '@/lib/shopee/client'
import { SHOPEE_PATH_SHOP_INFO } from '@/lib/shopee/config'
import { createNotification } from '@/lib/notify'

interface ShopInfoResponse {
  response?: {
    shop_name?: string
    shop_id?:   number
  }
  error?:   string
  message?: string
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code      = searchParams.get('code')
  const shopIdStr = searchParams.get('shop_id')
  const error     = searchParams.get('error')

  const redirect = (path: string) =>
    NextResponse.redirect(`${origin}${path}`)

  // Shopee cancelou ou negou
  if (error) {
    console.warn('[Shopee callback] OAuth erro:', error)
    return redirect('/dashboard/integracoes?shopee_error=cancelled')
  }

  if (!code || !shopIdStr) {
    console.error('[Shopee callback] Parâmetros ausentes — code:', code, 'shop_id:', shopIdStr)
    return redirect('/dashboard/integracoes?shopee_error=missing_params')
  }

  const shopIdNum = Number(shopIdStr)
  if (isNaN(shopIdNum)) {
    console.error('[Shopee callback] shop_id inválido:', shopIdStr)
    return redirect('/dashboard/integracoes?shopee_error=invalid_shop_id')
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
    console.error('[Shopee callback] Usuário não autenticado')
    return redirect('/login?redirect=/dashboard/integracoes')
  }

  console.log('[Shopee callback] user:', user.id, 'shop_id:', shopIdNum)

  try {
    // 1. Trocar code por tokens
    const tokens = await shopeeExchangeCode(code, shopIdNum)
    console.log('[Shopee callback] token exchange OK — expire_in:', tokens.expire_in)

    // 2. Buscar nome da loja
    let shopName = `Loja ${shopIdNum}`
    try {
      const info = await shopeeGet<ShopInfoResponse>(
        SHOPEE_PATH_SHOP_INFO,
        tokens.access_token,
        shopIdNum,
      )
      shopName = info.response?.shop_name ?? shopName
      console.log('[Shopee callback] shop_name:', shopName)
    } catch (infoErr) {
      console.warn('[Shopee callback] Não foi possível buscar nome da loja:', infoErr)
    }

    // 3. Salvar no banco
    await saveShopeeConnection(user.id, tokens, shopIdNum, shopName)
    console.log('[Shopee callback] saveShopeeConnection OK')

    // 4. Notificação de sucesso
    await createNotification({
      userId:    user.id,
      title:     'Shopee conectada!',
      message:   `Sua loja "${shopName}" foi conectada com sucesso ao Foguetim ERP.`,
      type:      'success',
      category:  'integration',
      actionUrl: '/dashboard/integracoes',
    })

    return redirect(
      `/dashboard/integracoes?shopee_connected=true&shop=${encodeURIComponent(shopName)}`
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Shopee callback] ERRO:', message)
    return redirect(`/dashboard/integracoes?shopee_error=${encodeURIComponent(message)}`)
  }
}
