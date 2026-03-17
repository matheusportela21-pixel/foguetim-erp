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
  console.log('[ML] Auth URL gerada:', url.replace(appId, `${appId.slice(0,4)}…`))
  return url
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<MLTokenResponse> {
  const { appId, secret, redirectUri } = getEnv()

  console.log('[ML] exchangeCode — client_id:', `${appId.slice(0,4)}…`, 'redirect_uri:', redirectUri)

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
  console.log('[ML] exchangeCode response status:', res.status)

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
  const { data: conn, error } = await db
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .single()

  if (error || !conn) return null

  const c = conn as MLConnection
  const expiresAt = new Date(c.expires_at)

  // Renova se vencer em menos de 5 minutos
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const tokens = await refreshToken(c.refresh_token)
      const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await db
        .from('marketplace_connections')
        .update({
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token,
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

  return c.access_token
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

/** Salva ou atualiza a conexão ML no banco após o callback OAuth */
export async function saveConnection(
  userId: string,
  tokens: MLTokenResponse,
  mlNickname: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  const { error } = await supabaseAdmin()
    .from('marketplace_connections')
    .upsert(
      {
        user_id:       userId,
        marketplace:   'mercadolivre',
        ml_user_id:    tokens.user_id,
        ml_nickname:   mlNickname,
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    expiresAt,
        connected:     true,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'user_id,marketplace' },
    )

  if (error) {
    console.error('[ML] saveConnection error:', error)
    throw new Error(`saveConnection falhou: ${error.message}`)
  }
  console.log('[ML] saveConnection OK — user_id:', userId, 'ml_nickname:', mlNickname)
}

/** Desconecta ML — mantém o registro mas marca connected = false */
export async function disconnectML(userId: string): Promise<void> {
  await supabaseAdmin()
    .from('marketplace_connections')
    .update({ connected: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
}

/** Retorna a conexão ML atual do usuário */
export async function getMLConnection(userId: string): Promise<MLConnection | null> {
  const { data } = await supabaseAdmin()
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .single()
  return data as MLConnection | null
}
