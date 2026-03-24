/**
 * lib/magalu/config.ts
 * Configurações e constantes da API Magalu (Open API).
 *
 * Variáveis de ambiente:
 *   MAGALU_CLIENT_ID       — OAuth2 Client ID
 *   MAGALU_CLIENT_SECRET   — OAuth2 Client Secret
 *   MAGALU_CLIENT_UUID     — UUID do Client
 *   MAGALU_API_KEY         — API Key do ID Magalu
 *   MAGALU_API_KEY_SECRET  — API Key Secret
 *   MAGALU_ENV             — 'sandbox' | 'prod' (padrão: sandbox)
 */

/** Base URL de acordo com o ambiente (default: prod) */
export function getMagaluBaseUrl(): string {
  return (process.env.MAGALU_ENV ?? 'prod') === 'sandbox'
    ? 'https://api-sandbox.magalu.com'
    : 'https://api.magalu.com'
}

/** URL do OAuth token endpoint (sempre produção — ID Magalu) */
export const MAGALU_OAUTH_TOKEN_URL = 'https://id.magalu.com/oauth/token'

/** Channel ID do sandbox */
export const MAGALU_SANDBOX_CHANNEL_ID = '5f62650a-0039-4d65-9b96-266d498c03bd'

/** Redirect URI para callback OAuth */
export const MAGALU_REDIRECT_URI =
  process.env.MAGALU_REDIRECT_URI ?? 'https://app.foguetim.com.br/api/magalu/callback'

// ─── API Paths ───────────────────────────────────────────────────────────────

export const MAGALU_PATH_SKUS          = '/seller/v1/portfolios/skus'
export const MAGALU_PATH_SKU_DETAIL    = '/seller/v1/portfolios/skus/{sku_id}'
export const MAGALU_PATH_SKU_PRICES    = '/seller/v1/portfolios/skus/{sku_id}/prices'
export const MAGALU_PATH_SKU_STOCKS    = '/seller/v1/portfolios/skus/{sku_id}/stocks'
export const MAGALU_PATH_ORDERS        = '/seller/v1/orders'
export const MAGALU_PATH_ORDER_DETAIL  = '/seller/v1/orders/{order_id}'
export const MAGALU_PATH_ORDER_DELIVERIES = '/seller/v1/orders/{order_id}/deliveries'
export const MAGALU_PATH_SANDBOX_ONBOARDING = '/v1/samples/onboarding'

/** Retorna 'sandbox' ou 'prod' para UI */
export function getMagaluEnvLabel(): 'sandbox' | 'prod' {
  return (process.env.MAGALU_ENV ?? 'prod') === 'sandbox' ? 'sandbox' : 'prod'
}

/** Retorna true se ambiente é produção */
export function isMagaluProd(): boolean {
  return getMagaluEnvLabel() === 'prod'
}

/** Retorna as variáveis de ambiente Magalu, lançando erro se ausentes */
export function getMagaluEnv(): {
  clientId:       string
  clientSecret:   string
  clientUuid:     string
  apiKey:         string
  apiKeySecret:   string
} {
  const clientId       = process.env.MAGALU_CLIENT_ID?.trim()
  const clientSecret   = process.env.MAGALU_CLIENT_SECRET?.trim()
  const clientUuid     = process.env.MAGALU_CLIENT_UUID?.trim()
  const apiKey         = process.env.MAGALU_API_KEY?.trim()
  const apiKeySecret   = process.env.MAGALU_API_KEY_SECRET?.trim()

  if (!clientId || !clientSecret) {
    throw new Error('[Magalu] MAGALU_CLIENT_ID e MAGALU_CLIENT_SECRET não configurados')
  }

  return {
    clientId,
    clientSecret,
    clientUuid:     clientUuid ?? '',
    apiKey:         apiKey ?? '',
    apiKeySecret:   apiKeySecret ?? '',
  }
}
