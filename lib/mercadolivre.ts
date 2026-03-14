/**
 * lib/mercadolivre.ts
 * Mercado Livre OAuth helper + typed fetch wrapper.
 */
import { supabase } from './supabase'

// ─── Constants ───────────────────────────────────────────────────────────────

export const ML_APP_ID      = process.env.ML_APP_ID!
export const ML_SECRET      = process.env.ML_CLIENT_SECRET!
export const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI!

export const ML_AUTH_URL   = 'https://auth.mercadolivre.com.br/authorization'
export const ML_TOKEN_URL  = 'https://api.mercadolibre.com/oauth/token'
export const ML_API_BASE   = 'https://api.mercadolibre.com'

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
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     ML_APP_ID,
    redirect_uri:  ML_REDIRECT_URI,
  })
  if (state) params.set('state', state)
  return `${ML_AUTH_URL}?${params.toString()}`
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<MLTokenResponse> {
  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      client_id:    ML_APP_ID,
      client_secret: ML_SECRET,
      code,
      redirect_uri: ML_REDIRECT_URI,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token exchange failed: ${err}`)
  }
  return res.json()
}

// ─── Token refresh ────────────────────────────────────────────────────────────

export async function refreshToken(refreshTk: string): Promise<MLTokenResponse> {
  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     ML_APP_ID,
      client_secret: ML_SECRET,
      refresh_token: refreshTk,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token refresh failed: ${err}`)
  }
  return res.json()
}

// ─── getValidToken — fetches and auto-refreshes ───────────────────────────────

export async function getValidToken(userId: string): Promise<string | null> {
  const { data: conn, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .single()

  if (error || !conn) return null

  const c = conn as MLConnection
  const expiresAt = new Date(c.expires_at)

  // Refresh if within 5 minutes of expiry
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const tokens = await refreshToken(c.refresh_token)
      const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      await supabase
        .from('marketplace_connections')
        .update({
          access_token:  tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at:    newExpiry,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', c.id)
      return tokens.access_token
    } catch {
      return null
    }
  }

  return c.access_token
}

// ─── mlFetch — authenticated API call ─────────────────────────────────────────

export async function mlFetch<T = unknown>(
  userId: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getValidToken(userId)
  if (!token) throw new Error('No valid Mercado Livre token')

  const url = path.startsWith('http') ? path : `${ML_API_BASE}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML API error ${res.status}: ${err}`)
  }

  return res.json()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Save or update a ML connection in the DB after OAuth callback */
export async function saveConnection(
  userId: string,
  tokens: MLTokenResponse,
  mlNickname: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase
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
}

/** Disconnect ML — keeps row but sets connected = false */
export async function disconnectML(userId: string): Promise<void> {
  await supabase
    .from('marketplace_connections')
    .update({ connected: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
}

/** Get current ML connection for a user */
export async function getMLConnection(userId: string): Promise<MLConnection | null> {
  const { data } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .single()
  return data as MLConnection | null
}
