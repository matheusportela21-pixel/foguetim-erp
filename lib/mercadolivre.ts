/**
 * lib/mercadolivre.ts
 * Mercado Livre OAuth helper + typed fetch wrapper.
 *
 * SEGURANÇA: Este módulo NUNCA executa ações automáticas na conta ML.
 * Toda escrita (criar/editar/excluir anúncio, responder pergunta, alterar preço/estoque)
 * requer clique manual do usuário + confirmação explícita no front-end.
 * Sincronização é apenas LEITURA (importar dados para visualização).
 */
import { supabaseAdmin } from './supabase-admin'
import { encrypt, decrypt } from './crypto'

// ─── Constants (lazy — lidos dentro das funções para garantir disponibilidade) ──

export const ML_AUTH_URL  = 'https://auth.mercadolivre.com.br/authorization'
export const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
export const ML_API_BASE  = 'https://api.mercadolibre.com'

function getEnv() {
  const appId     = process.env.ML_APP_ID
  const secret    = process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!appId || !secret || !redirectUri) {
    console.error('[ML] Variáveis de ambiente ausentes:', {
      ML_APP_ID:      appId     ? `${appId.slice(0,4)}…` : 'UNDEFINED',
      ML_CLIENT_SECRET: secret  ? '***' : 'UNDEFINED',
      ML_REDIRECT_URI: redirectUri ?? 'UNDEFINED',
    })
    throw new Error('Variáveis de ambiente do Mercado Livre não configuradas no servidor')
  }

  return { appId, secret, redirectUri }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MLTokenResponse {
  access_token:  string
  token_type:    string
  expires_in:    number
  scope:         string
  user_id:       number
  refresh_token: string
}

export interface MLConnection {
  id:            string
  user_id:       string
  marketplace:   string
  ml_user_id:    number
  ml_nickname:   string
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

export function getAuthorizationUrl(state?: string): string {
  const { appId, redirectUri } = getEnv()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     appId,
    redirect_uri:  redirectUri,
    // Solicita escopos de publicidade para ML Product Ads
    scope:         'offline_access read_campaigns write_campaigns',
  })
  if (state) params.set('state', state)
  const url = `${ML_AUTH_URL}?${params.toString()}`
  return url
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<MLTokenResponse> {
  const { appId, secret, redirectUri } = getEnv()

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     appId,
    client_secret: secret,
    code,
    redirect_uri:  redirectUri,
  })

  const res = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const text = await res.text()

  if (!res.ok) {
    console.error('[ML] exchangeCode error body:', text)
    throw new Error(`ML token exchange failed (${res.status}): ${text}`)
  }

  return JSON.parse(text) as MLTokenResponse
}

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function refreshToken(refreshTk: string): Promise<MLTokenResponse> {
  const { appId, secret } = getEnv()

  const res = await fetch(ML_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     appId,
      client_secret: secret,
      refresh_token: refreshTk,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token refresh failed (${res.status}): ${err}`)
  }

  return res.json()
}

// ─── getValidToken — busca e auto-renova se necessário ───────────────────────

export async function getValidToken(userId: string): Promise<string | null> {
  const db = supabaseAdmin()
  // Prefer primary; fall back to first active connection if none set as primary
  const { data: conn, error } = await db
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !conn) return null

  const c = conn as MLConnection
  const expiresAt = new Date(c.expires_at)

  // Descriptografar refresh_token (suporta plaintext legado sem prefixo "enc:")
  let plainRefresh: string
  try {
    plainRefresh = await decrypt(c.refresh_token)
  } catch {
    console.error('[ML] decrypt refresh_token failed')
    return null
  }

  // Renova se vencer em menos de 5 minutos
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const tokens = await refreshToken(plainRefresh)
      const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await db
        .from('marketplace_connections')
        .update({
          access_token:  await encrypt(tokens.access_token),
          refresh_token: await encrypt(tokens.refresh_token),
          expires_at:    newExpiry,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', c.id)
      return tokens.access_token
    } catch (err) {
      console.error('[ML] refreshToken failed:', err)
      return null
    }
  }

  // Descriptografar access_token (suporta plaintext legado)
  try {
    return await decrypt(c.access_token)
  } catch {
    console.error('[ML] decrypt access_token failed')
    return null
  }
}

// ─── mlFetch — chamada autenticada à API ML ───────────────────────────────────

export async function mlFetch<T = unknown>(
  userId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getValidToken(userId)
  if (!token) throw new Error('Sem token válido do Mercado Livre. Reconecte sua conta.')

  const url = path.startsWith('http') ? path : `${ML_API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML API ${res.status} em ${path}: ${err}`)
  }

  return res.json()
}

// ─── Helpers de conexão ───────────────────────────────────────────────────────

/** Salva ou atualiza a conexão ML no banco após o callback OAuth.
 *  - Se a conta ML (ml_user_id) já existe para este usuário → atualiza tokens.
 *  - Se é uma nova conta ML → insere nova linha; define is_primary se for a primeira.
 */
export async function saveConnection(
  userId: string,
  tokens: MLTokenResponse,
  mlNickname: string,
): Promise<void> {
  const db        = supabaseAdmin()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const now       = new Date().toISOString()

  // Criptografar tokens antes de armazenar
  const encAccess  = await encrypt(tokens.access_token)
  const encRefresh = await encrypt(tokens.refresh_token)

  // Verificar se esta conta ML já está registrada para este usuário
  const { data: existing } = await db
    .from('marketplace_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('ml_user_id', tokens.user_id)
    .maybeSingle()

  if (existing) {
    // Re-conectando conta existente — apenas atualiza os tokens
    const { error } = await db
      .from('marketplace_connections')
      .update({
        ml_nickname:   mlNickname,
        access_token:  encAccess,
        refresh_token: encRefresh,
        expires_at:    expiresAt,
        connected:     true,
        updated_at:    now,
      })
      .eq('id', existing.id)
    if (error) throw new Error(`saveConnection (update) falhou: ${error.message}`)
  } else {
    // Nova conta ML — verifica se é a primeira para definir is_primary
    const { count } = await db
      .from('marketplace_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('marketplace', 'mercadolivre')
      .eq('connected', true)

    const { error } = await db
      .from('marketplace_connections')
      .insert({
        user_id:       userId,
        marketplace:   'mercadolivre',
        ml_user_id:    tokens.user_id,
        ml_nickname:   mlNickname,
        account_label: null,
        access_token:  encAccess,
        refresh_token: encRefresh,
        expires_at:    expiresAt,
        connected:     true,
        is_primary:    (count ?? 0) === 0,
        updated_at:    now,
      })
    if (error) throw new Error(`saveConnection (insert) falhou: ${error.message}`)
  }

}

/** Desconecta todas as contas ML — mantém registros mas marca connected = false */
export async function disconnectML(userId: string): Promise<void> {
  await supabaseAdmin()
    .from('marketplace_connections')
    .update({ connected: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
}

/** Desconecta uma conta ML específica. Se era a primária, promove a próxima ativa. */
export async function disconnectMLById(userId: string, connectionId: string): Promise<void> {
  const db = supabaseAdmin()

  const { data: conn } = await db
    .from('marketplace_connections')
    .select('id, is_primary')
    .eq('id', connectionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!conn) return

  await db
    .from('marketplace_connections')
    .update({ connected: false, is_primary: false, updated_at: new Date().toISOString() })
    .eq('id', connectionId)

  // Se era a primária, promove a próxima conta ativa
  if (conn.is_primary) {
    const { data: next } = await db
      .from('marketplace_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'mercadolivre')
      .eq('connected', true)
      .neq('id', connectionId)
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

/** Retorna a conexão ML primária do usuário (compatibilidade retroativa) */
export async function getMLConnection(userId: string): Promise<MLConnection | null> {
  const { data } = await supabaseAdmin()
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data as MLConnection | null
}

/** Retorna todas as conexões ML ativas do usuário */
export async function getMLConnections(userId: string): Promise<MLConnection[]> {
  const { data } = await supabaseAdmin()
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  return (data ?? []) as MLConnection[]
}

/** Define uma conta ML como primária (e remove a flag das demais) */
export async function setMLPrimary(userId: string, connectionId: string): Promise<void> {
  const db = supabaseAdmin()
  // Remove primary de todas
  await db
    .from('marketplace_connections')
    .update({ is_primary: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
  // Define a escolhida
  await db
    .from('marketplace_connections')
    .update({ is_primary: true, updated_at: new Date().toISOString() })
    .eq('id', connectionId)
    .eq('user_id', userId)
}
