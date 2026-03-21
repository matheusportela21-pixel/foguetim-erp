/**
 * lib/shopee/auth.ts
 * OAuth Shopee v2: URL de autorização, troca de código, refresh de token,
 * busca de token válido com auto-renovação e persistência no banco.
 *
 * Usa marketplace_connections com marketplace='shopee'.
 * Campos reutilizados:
 *   ml_user_id  → shop_id (TEXT no banco)
 *   ml_nickname → nome da loja
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { encrypt, decrypt } from '@/lib/crypto'
import {
  getShopeeBaseUrl,
  getShopeeEnv,
  SHOPEE_PATH_AUTH,
  SHOPEE_PATH_TOKEN,
  SHOPEE_PATH_REFRESH,
} from './config'
import { shopeeSign, nowTs } from './sign'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopeeTokenResponse {
  access_token:  string
  refresh_token: string
  expire_in:     number   // segundos até expirar o access_token
  request_id:    string
  error?:        string
  message?:      string
}

export interface ShopeeConnection {
  id:            string
  user_id:       string
  marketplace:   string
  ml_user_id:    string   // shop_id como string
  ml_nickname:   string   // nome da loja
  account_label: string | null
  is_primary:    boolean
  access_token:  string
  refresh_token: string
  expires_at:    string
  connected:     boolean
  created_at:    string
  updated_at:    string
}

// ─── Authorization URL ────────────────────────────────────────────────────────

/** Gera a URL de autorização OAuth Shopee para redirecionar o usuário */
export function getShopeeAuthUrl(): string {
  const { partnerId, partnerKey, redirectUri } = getShopeeEnv()
  const timestamp = nowTs()

  // Base string exatamente como a Shopee especifica: partnerId + path + timestamp
  const baseString = `${partnerId}${SHOPEE_PATH_AUTH}${timestamp}`
  const sign = shopeeSign(partnerKey, partnerId, SHOPEE_PATH_AUTH, timestamp)

  // ── DIAGNÓSTICO (sem expor a key) ─────────────────────────────────────────
  // Usando console.error para garantir visibilidade nos logs do Vercel
  console.error('[Shopee auth] DIAGNÓSTICO ─────────────────────')
  console.error('[Shopee auth] partnerId       :', partnerId, '| tipo:', typeof partnerId)
  console.error('[Shopee auth] partnerKeyLength:', partnerKey.length)
  console.error('[Shopee auth] partnerKeyStart :', partnerKey.slice(0, 6) + '...')
  console.error('[Shopee auth] timestamp       :', timestamp, '| tipo:', typeof timestamp)
  console.error('[Shopee auth] baseString      :', baseString)
  console.error('[Shopee auth] sign            :', sign)
  console.error('[Shopee auth] redirectUri     :', redirectUri)
  console.error('[Shopee auth] baseUrl         :', getShopeeBaseUrl())
  console.error('[Shopee auth] ──────────────────────────────────')

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp:  String(timestamp),
    sign,
    redirect:   redirectUri,
  })

  const url = `${getShopeeBaseUrl()}${SHOPEE_PATH_AUTH}?${params.toString()}`
  console.error('[Shopee auth] URL final:', url.replace(sign, sign.slice(0, 8) + '...'))
  return url
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

/** Troca o authorization code por access_token + refresh_token */
export async function shopeeExchangeCode(
  code:   string,
  shopId: number,
): Promise<ShopeeTokenResponse> {
  const { partnerId, partnerKey } = getShopeeEnv()
  const timestamp = nowTs()
  const sign = shopeeSign(partnerKey, partnerId, SHOPEE_PATH_TOKEN, timestamp)

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp:  String(timestamp),
    sign,
  })

  const url = `${getShopeeBaseUrl()}${SHOPEE_PATH_TOKEN}?${params.toString()}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ code, shop_id: shopId, partner_id: partnerId }),
  })

  const text = await res.text()
  console.log('[Shopee] exchangeCode status:', res.status)

  if (!res.ok) {
    console.error('[Shopee] exchangeCode error:', text)
    throw new Error(`Shopee token exchange falhou (${res.status}): ${text}`)
  }

  const data = JSON.parse(text) as ShopeeTokenResponse
  if (data.error && data.error !== '') {
    throw new Error(`Shopee token exchange erro: ${data.error} — ${data.message ?? ''}`)
  }

  return data
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

/** Renova o access_token usando o refresh_token */
export async function shopeeRefreshToken(
  refreshToken: string,
  shopId:       number,
): Promise<ShopeeTokenResponse> {
  const { partnerId, partnerKey } = getShopeeEnv()
  const timestamp = nowTs()
  const sign = shopeeSign(partnerKey, partnerId, SHOPEE_PATH_REFRESH, timestamp)

  const params = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp:  String(timestamp),
    sign,
  })

  const url = `${getShopeeBaseUrl()}${SHOPEE_PATH_REFRESH}?${params.toString()}`
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken, shop_id: shopId, partner_id: partnerId }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopee token refresh falhou (${res.status}): ${text}`)
  }

  const data = await res.json() as ShopeeTokenResponse
  if (data.error && data.error !== '') {
    throw new Error(`Shopee refresh erro: ${data.error} — ${data.message ?? ''}`)
  }

  return data
}

// ─── getValidShopeeToken ──────────────────────────────────────────────────────

/** Retorna um access_token válido para a loja, renovando automaticamente se necessário.
 *  Retorna null se nenhuma conexão Shopee ativa existir.
 */
export async function getValidShopeeToken(userId: string): Promise<{
  accessToken: string
  shopId:      number
} | null> {
  const db = supabaseAdmin()

  const { data: conn, error } = await db
    .from('marketplace_connections')
    .select('*')
    .eq('user_id',    userId)
    .eq('marketplace', 'shopee')
    .eq('connected',  true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !conn) return null

  const c = conn as ShopeeConnection
  const shopId    = Number(c.ml_user_id)
  const expiresAt = new Date(c.expires_at)

  // Descriptografar refresh_token
  let plainRefresh: string
  try {
    plainRefresh = await decrypt(c.refresh_token)
  } catch {
    console.error('[Shopee] decrypt refresh_token falhou')
    return null
  }

  // Renova se vencer em menos de 5 minutos
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const tokens  = await shopeeRefreshToken(plainRefresh, shopId)
      const newExpiry = new Date(Date.now() + tokens.expire_in * 1000).toISOString()

      await db
        .from('marketplace_connections')
        .update({
          access_token:  await encrypt(tokens.access_token),
          refresh_token: await encrypt(tokens.refresh_token),
          expires_at:    newExpiry,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', c.id)

      console.log('[Shopee] token renovado para shop_id:', shopId)
      return { accessToken: tokens.access_token, shopId }
    } catch (err) {
      console.error('[Shopee] refresh falhou:', err)
      return null
    }
  }

  // Descriptografar access_token
  try {
    const plainAccess = await decrypt(c.access_token)
    return { accessToken: plainAccess, shopId }
  } catch {
    console.error('[Shopee] decrypt access_token falhou')
    return null
  }
}

// ─── saveShopeeConnection ─────────────────────────────────────────────────────

/** Persiste ou atualiza a conexão Shopee no banco após o callback OAuth */
export async function saveShopeeConnection(
  userId:    string,
  tokens:    ShopeeTokenResponse,
  shopId:    number,
  shopName:  string,
): Promise<void> {
  const db        = supabaseAdmin()
  const expiresAt = new Date(Date.now() + tokens.expire_in * 1000).toISOString()
  const now       = new Date().toISOString()

  const encAccess  = await encrypt(tokens.access_token)
  const encRefresh = await encrypt(tokens.refresh_token)

  // Verificar se esta loja já existe para este usuário
  const { data: existing } = await db
    .from('marketplace_connections')
    .select('id')
    .eq('user_id',    userId)
    .eq('marketplace', 'shopee')
    .eq('ml_user_id', String(shopId))
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('marketplace_connections')
      .update({
        ml_nickname:   shopName,
        access_token:  encAccess,
        refresh_token: encRefresh,
        expires_at:    expiresAt,
        connected:     true,
        updated_at:    now,
      })
      .eq('id', existing.id)

    if (error) throw new Error(`saveShopeeConnection (update) falhou: ${error.message}`)
  } else {
    // Primeira conexão Shopee → is_primary = true
    const { count } = await db
      .from('marketplace_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id',    userId)
      .eq('marketplace', 'shopee')
      .eq('connected',  true)

    const { error } = await db
      .from('marketplace_connections')
      .insert({
        user_id:       userId,
        marketplace:   'shopee',
        ml_user_id:    String(shopId),
        ml_nickname:   shopName,
        account_label: null,
        access_token:  encAccess,
        refresh_token: encRefresh,
        expires_at:    expiresAt,
        connected:     true,
        is_primary:    (count ?? 0) === 0,
        updated_at:    now,
      })

    if (error) throw new Error(`saveShopeeConnection (insert) falhou: ${error.message}`)
  }

  console.log('[Shopee] saveShopeeConnection OK — shop_id:', shopId, 'shop:', shopName)
}

// ─── getShopeeConnections ─────────────────────────────────────────────────────

/** Retorna todas as conexões Shopee ativas do usuário */
export async function getShopeeConnections(userId: string): Promise<ShopeeConnection[]> {
  const { data } = await supabaseAdmin()
    .from('marketplace_connections')
    .select('*')
    .eq('user_id',    userId)
    .eq('marketplace', 'shopee')
    .eq('connected',  true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  return (data ?? []) as ShopeeConnection[]
}

/** Desconecta uma loja Shopee específica */
export async function disconnectShopeeById(userId: string, connectionId: string): Promise<void> {
  const db = supabaseAdmin()

  const { data: conn } = await db
    .from('marketplace_connections')
    .select('id, is_primary')
    .eq('id',      connectionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!conn) return

  await db
    .from('marketplace_connections')
    .update({ connected: false, is_primary: false, updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  // Promove próxima conta se era a primária
  if (conn.is_primary) {
    const { data: next } = await db
      .from('marketplace_connections')
      .select('id')
      .eq('user_id',    userId)
      .eq('marketplace', 'shopee')
      .eq('connected',  true)
      .neq('id',        connectionId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (next) {
      await db
        .from('marketplace_connections')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', next.id)
    }
  }
}
