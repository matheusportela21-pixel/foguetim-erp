/**
 * lib/shopee/client.ts
 * Cliente HTTP autenticado para a API Shopee v2.
 * Assina automaticamente cada requisição com HMAC-SHA256.
 */
import { getShopeeBaseUrl, getShopeeEnv } from './config'
import { shopeeSign, nowTs } from './sign'

/** Faz uma requisição GET autenticada a uma API de loja Shopee */
export async function shopeeGet<T = unknown>(
  apiPath:     string,
  accessToken: string,
  shopId:      number,
  extraParams: Record<string, string | number | boolean> = {},
): Promise<T> {
  const { partnerId, partnerKey } = getShopeeEnv()
  const timestamp = nowTs()
  const sign = shopeeSign(partnerKey, partnerId, apiPath, timestamp, accessToken, shopId)

  const params = new URLSearchParams({
    partner_id:   String(partnerId),
    timestamp:    String(timestamp),
    sign,
    access_token: accessToken,
    shop_id:      String(shopId),
    ...Object.fromEntries(
      Object.entries(extraParams).map(([k, v]) => [k, String(v)])
    ),
  })

  const url = `${getShopeeBaseUrl()}${apiPath}?${params.toString()}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Shopee] GET ${apiPath} falhou (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

/** Faz uma requisição POST autenticada a uma API de loja Shopee (shop-level writes) */
export async function shopeePost<T = unknown>(
  apiPath:     string,
  accessToken: string,
  shopId:      number,
  body:        Record<string, unknown>,
): Promise<T> {
  const { partnerId, partnerKey } = getShopeeEnv()
  const timestamp = nowTs()
  const sign = shopeeSign(partnerKey, partnerId, apiPath, timestamp, accessToken, shopId)

  const params = new URLSearchParams({
    partner_id:   String(partnerId),
    timestamp:    String(timestamp),
    sign,
    access_token: accessToken,
    shop_id:      String(shopId),
  })

  const url = `${getShopeeBaseUrl()}${apiPath}?${params.toString()}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Shopee] POST ${apiPath} falhou (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

/** Faz uma requisição POST autenticada a uma API pública Shopee (ex: token) */
export async function shopeePostPublic<T = unknown>(
  apiPath: string,
  body:    Record<string, unknown>,
): Promise<T> {
  const { partnerId, partnerKey } = getShopeeEnv()
  const timestamp = nowTs()
  const sign = shopeeSign(partnerKey, partnerId, apiPath, timestamp)

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp:  String(timestamp),
    sign,
  })

  const url = `${getShopeeBaseUrl()}${apiPath}?${params.toString()}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Shopee] POST ${apiPath} falhou (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}
