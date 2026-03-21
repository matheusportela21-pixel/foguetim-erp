/**
 * lib/shopee/config.ts
 * Configurações e constantes da API Shopee v2.
 *
 * Variáveis de ambiente necessárias:
 *   SHOPEE_PARTNER_ID   — Número (ex: 12345678)
 *   SHOPEE_PARTNER_KEY  — String hexadecimal (chave secreta)
 *   SHOPEE_REDIRECT_URI — URL de callback (padrão: https://app.foguetim.com.br/api/shopee/callback)
 *   SHOPEE_ENV          — 'test' | 'prod' (padrão: 'test')
 */

/** Base URL de acordo com o ambiente */
export function getShopeeBaseUrl(): string {
  const env = process.env.SHOPEE_ENV ?? 'test'
  return env === 'prod'
    ? 'https://partner.shopeemobile.com'
    : 'https://partner.test-stable.shopeemobile.com'
}

export const SHOPEE_PATH_AUTH        = '/api/v2/shop/auth_partner'
export const SHOPEE_PATH_TOKEN       = '/api/v2/auth/token/get'
export const SHOPEE_PATH_REFRESH     = '/api/v2/auth/access_token/get'
export const SHOPEE_PATH_SHOP_INFO   = '/api/v2/shop/get_shop_info'
export const SHOPEE_PATH_ITEM_LIST   = '/api/v2/product/get_item_list'
export const SHOPEE_PATH_ORDER_LIST  = '/api/v2/order/get_order_list'
export const SHOPEE_PATH_PERFORMANCE = '/api/v2/shop/get_shop_performance'

/** Retorna as variáveis de ambiente Shopee, lançando erro se ausentes.
 *  .trim() é aplicado em TODAS as strings para remover whitespace/newlines
 *  que podem existir em arquivos .env e corromper o HMAC-SHA256.
 */
export function getShopeeEnv(): {
  partnerId:   number
  partnerKey:  string
  redirectUri: string
} {
  const rawPartnerId  = process.env.SHOPEE_PARTNER_ID?.trim()
  const rawPartnerKey = process.env.SHOPEE_PARTNER_KEY?.trim()
  const redirectUri   = (
    process.env.SHOPEE_REDIRECT_URI?.trim() ??
    'https://app.foguetim.com.br/api/shopee/callback'
  )

  if (!rawPartnerId || !rawPartnerKey) {
    throw new Error(
      '[Shopee] SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY não configurados no servidor'
    )
  }

  const partnerId = Number(rawPartnerId)
  if (isNaN(partnerId)) {
    throw new Error(`[Shopee] SHOPEE_PARTNER_ID inválido (não é número): "${rawPartnerId}"`)
  }

  // Log de diagnóstico (apenas em dev — nunca logar a key completa em prod)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Shopee] env carregado —', {
      partnerId,
      keyLength:   rawPartnerKey.length,
      keyPreview:  `${rawPartnerKey.slice(0, 6)}…${rawPartnerKey.slice(-4)}`,
      redirectUri,
      env:         process.env.SHOPEE_ENV ?? 'test (padrão)',
    })
  }

  return { partnerId, partnerKey: rawPartnerKey, redirectUri }
}
