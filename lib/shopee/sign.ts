/**
 * lib/shopee/sign.ts
 * Geração de assinatura HMAC-SHA256 para a API Shopee v2.
 *
 * Referência: https://open.shopee.com/documents/v2/v2.authentication
 *
 * Fórmula da assinatura:
 *   - APIs públicas (auth, token): HMAC-SHA256(key=partner_key, msg="{partner_id}{api_path}{timestamp}")
 *   - APIs de loja (shop-level):   HMAC-SHA256(key=partner_key, msg="{partner_id}{api_path}{timestamp}{access_token}{shop_id}")
 * O resultado é a representação hexadecimal em minúsculas do digest.
 */
import { createHmac } from 'crypto'

/**
 * Gera a assinatura HMAC-SHA256 para uma requisição à API Shopee v2.
 *
 * @param partnerKey  - Chave secreta do parceiro (SHOPEE_PARTNER_KEY)
 * @param partnerId   - ID do parceiro (SHOPEE_PARTNER_ID)
 * @param apiPath     - Caminho da API (ex: '/api/v2/shop/get_shop_info')
 * @param timestamp   - Unix timestamp em segundos
 * @param accessToken - Token de acesso (apenas para APIs de loja)
 * @param shopId      - ID da loja (apenas para APIs de loja)
 */
export function shopeeSign(
  partnerKey:   string,
  partnerId:    number,
  apiPath:      string,
  timestamp:    number,
  accessToken?: string,
  shopId?:      number,
): string {
  // Base string: concatenação pura, sem separadores
  // Pública:    "{partnerId}{apiPath}{timestamp}"
  // Shop-level: "{partnerId}{apiPath}{timestamp}{accessToken}{shopId}"
  let base = `${partnerId}${apiPath}${timestamp}`
  if (accessToken !== undefined) base += accessToken
  if (shopId      !== undefined) base += shopId

  const sign = createHmac('sha256', partnerKey)
    .update(base)
    .digest('hex')

  return sign
}

/** Retorna o Unix timestamp atual em segundos */
export function nowTs(): number {
  return Math.floor(Date.now() / 1000)
}
