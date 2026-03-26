/**
 * lib/magalu/client.ts
 * Cliente HTTP para a API Magalu (Open API).
 * Mais simples que Shopee — sem HMAC, usa Bearer token + headers.
 */
import { getMagaluBaseUrl, MAGALU_SANDBOX_CHANNEL_ID, isMagaluProd } from './config'

/** Headers padrão para chamadas Magalu */
function magaluHeaders(accessToken: string, sellerId?: string, channelId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  }

  // Channel ID: só usa em sandbox
  if (!isMagaluProd()) {
    const ch = channelId ?? MAGALU_SANDBOX_CHANNEL_ID
    if (ch) headers['X-Channel-Id'] = ch
  }

  // Tenant ID: seller_id (obrigatório em produção para selecionar tenant)
  if (sellerId) headers['X-Tenant-Id'] = sellerId

  return headers
}

/** GET autenticado na API Magalu */
export async function magaluGet<T = unknown>(
  path:        string,
  accessToken: string,
  sellerId?:   string,
  params?:     Record<string, string | number>,
  channelId?:  string,
): Promise<T> {
  const qs = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString() : ''

  const url = `${getMagaluBaseUrl()}${path}${qs}`
  const start = Date.now()

  const res = await fetch(url, {
    headers: magaluHeaders(accessToken, sellerId, channelId),
  })

  if (res.status === 429) {
    // Rate limit — wait and retry once
    const retryAfter = Number(res.headers.get('Retry-After') ?? '5')
    console.warn(`[Magalu] Rate limited, retrying in ${retryAfter}s`)
    await new Promise(r => setTimeout(r, retryAfter * 1000))
    const retry = await fetch(url, { headers: magaluHeaders(accessToken, sellerId, channelId) })
    if (!retry.ok) {
      const text = await retry.text()
      throw new Error(`[Magalu] GET ${path} falhou após retry (${retry.status}): ${text}`)
    }
    return retry.json() as Promise<T>
  }

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Magalu API] GET ${path} ERRO ${res.status}:`, text.substring(0, 500))
    throw new Error(`[Magalu] GET ${path} falhou (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

/** POST autenticado na API Magalu */
export async function magaluPost<T = unknown>(
  path:        string,
  body:        unknown,
  accessToken: string,
  sellerId?:   string,
  channelId?:  string,
): Promise<T> {
  const url = `${getMagaluBaseUrl()}${path}`
  const start = Date.now()

  const res = await fetch(url, {
    method:  'POST',
    headers: magaluHeaders(accessToken, sellerId, channelId),
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Magalu] POST ${path} falhou (${res.status}): ${text}`)
  }

  return res.json() as Promise<T>
}

/** PUT autenticado na API Magalu */
export async function magaluPut<T = unknown>(
  path:        string,
  body:        unknown,
  accessToken: string,
  sellerId?:   string,
  channelId?:  string,
): Promise<T> {
  const url = `${getMagaluBaseUrl()}${path}`
  const start = Date.now()

  const res = await fetch(url, {
    method:  'PUT',
    headers: magaluHeaders(accessToken, sellerId, channelId),
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[Magalu] PUT ${path} falhou (${res.status}): ${text}`)
  }

  // Some PUT endpoints return 204 No Content
  if (res.status === 204) return {} as T

  return res.json() as Promise<T>
}
