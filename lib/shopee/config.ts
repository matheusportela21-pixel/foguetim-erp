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

/** Retorna as variáveis de ambiente Shopee, lançando erro se ausentes */
export function getShopeeEnv(): {
  partnerId:   number
  partnerKey:  string
  redirectUri: string
} {
  const partnerId  = process.env.SHOPEE_PARTNER_ID
  const partnerKey = process.env.SHOPEE_PARTNER_KEY
  const redirectUri =
    process.env.SHOPEE_REDIRECT_URI ??
    'https://app.foguetim.com.br/api/shopee/callback'

  if (!partnerId || !partnerKey) {
    throw new Error(
      '[Shopee] SHOPEE_PARTNER_ID e SHOPEE_PARTNER_KEY não configurados no servidor'
    )
  }

  return { partnerId: Number(partnerId), partnerKey, redirectUri }
}
