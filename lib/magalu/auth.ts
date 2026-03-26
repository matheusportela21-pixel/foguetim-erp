/**
 * lib/magalu/auth.ts
 * OAuth Magalu: troca de código, refresh (uso único!), token válido,
 * persistência e gestão de conexões.
 *
 * Usa marketplace_connections com marketplace='magalu'.
 * Campos reutilizados:
 *   ml_user_id  → seller_id
 *   ml_nickname → seller alias / nome da loja
 *
 * ATENÇÃO: O refresh_token do Magalu é USO ÚNICO.
 * Ao fazer refresh, SEMPRE salvar o NOVO refresh_token atomicamente.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { encrypt, decrypt } from '@/lib/crypto'
import { getMagaluEnv, MAGALU_OAUTH_TOKEN_URL, MAGALU_REDIRECT_URI } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MagaluTokenResponse {
  access_token:  string
  refresh_token: string
  token_type:    string
  expires_in:    number   // segundos (ex: 7200 = 2h)
  scope:         string
  created_at:    number   // Unix timestamp
}

export interface MagaluConnection {
  id:            string
  user_id:       string
  marketplace:   string
  ml_user_id:    string   // seller_id
  ml_nickname:   string   // seller alias
  account_label: string | null
  is_primary:    boolean
  access_token:  string
  refresh_token: string
  expires_at:    string
  connected:     boolean
  created_at:    string
  updated_at:    string
}

// ─── Token Exchange ───────────────────────────────────────────────────────────

/** Troca o authorization code por access_token + refresh_token.
 *  O code expira em 10 minutos — chamar imediatamente no callback!
 */
export async function magaluExchangeCode(code: string): Promise<MagaluTokenResponse> {
  const { clientId, clientSecret } = getMagaluEnv()

  const res = await fetch(MAGALU_OAUTH_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      grant_type:    'authorization_code',
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      redirect_uri:  MAGALU_REDIRECT_URI,
    }),
  })

  const text = await res.text()

  if (!res.ok) {
    console.error('[Magalu] exchangeCode error:', text)
    throw new Error(`Magalu token exchange falhou (${res.status}): ${text}`)
  }

  return JSON.parse(text) as MagaluTokenResponse
}

// ─── Token Refresh (USO ÚNICO!) ──────────────────────────────────────────────

/** Renova o access_token.
 *  CRÍTICO: O refresh_token é uso único no Magalu!
 *  Sempre salvar o novo refresh_token antes de descartar o antigo.
 */
export async function magaluRefreshToken(refreshToken: string): Promise<MagaluTokenResponse> {
  const { clientId, clientSecret } = getMagaluEnv()

  const res = await fetch(MAGALU_OAUTH_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Magalu token refresh falhou (${res.status}): ${text}`)
  }

  return await res.json() as MagaluTokenResponse
}

// ─── getValidMagaluToken ─────────────────────────────────────────────────────

/** Retorna um access_token válido para o seller, renovando automaticamente se necessário.
 *  Retorna null se nenhuma conexão Magalu ativa existir.
 */
export async function getValidMagaluToken(userId: string): Promise<{
  accessToken: string
  sellerId:    string
} | null> {
  const db = supabaseAdmin()

  const { data: conn, error } = await db
    .from('marketplace_connections')
    .select('*')
    .eq('user_id',     userId)
    .eq('marketplace', 'magalu')
    .eq('connected',   true)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !conn) return null

  const c = conn as MagaluConnection
  const sellerId  = c.ml_user_id
  const expiresAt = new Date(c.expires_at)

  // Descriptografar refresh_token
  let plainRefresh: string
  try {
    plainRefresh = await decrypt(c.refresh_token)
  } catch {
    console.error('[Magalu] decrypt refresh_token falhou')
    return null
  }

  // Renova se vencer em menos de 5 minutos
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    try {
      const tokens  = await magaluRefreshToken(plainRefresh)
      const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

      // TRANSAÇÃO ATÔMICA: salvar novo access_token E novo refresh_token juntos
      // O refresh_token antigo fica inválido após o uso
      await db
        .from('marketplace_connections')
        .update({
          access_token:  await encrypt(tokens.access_token),
          refresh_token: await encrypt(tokens.refresh_token),
          expires_at:    newExpiry,
          updated_at:    new Date().toISOString(),
        })
        .eq('id', c.id)

      return { accessToken: tokens.access_token, sellerId }
    } catch (err) {
      console.error('[Magalu] refresh falhou:', err)
      return null
    }
  }

  // Descriptografar access_token
  try {
    const plainAccess = await decrypt(c.access_token)
    return { accessToken: plainAccess, sellerId }
  } catch {
    console.error('[Magalu] decrypt access_token falhou')
    return null
  }
}

// ─── saveMagaluConnection ─────────────────────────────────────────────────────

/** Persiste ou atualiza a conexão Magalu no banco após o callback OAuth */
export async function saveMagaluConnection(
  userId:      string,
  tokens:      MagaluTokenResponse,
  sellerId:    string,
  sellerAlias: string,
): Promise<void> {
  const db        = supabaseAdmin()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const now       = new Date().toISOString()

  const encAccess  = await encrypt(tokens.access_token)
  const encRefresh = await encrypt(tokens.refresh_token)

  // Verificar se este seller já existe para este usuário
  const { data: existing } = await db
    .from('marketplace_connections')
    .select('id')
    .eq('user_id',     userId)
    .eq('marketplace', 'magalu')
    .eq('ml_user_id',  sellerId)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('marketplace_connections')
      .update({
        ml_nickname:   sellerAlias,
        access_token:  encAccess,
        refresh_token: encRefresh,
        expires_at:    expiresAt,
        connected:     true,
        updated_at:    now,
      })
      .eq('id', existing.id)

    if (error) throw new Error(`saveMagaluConnection (update) falhou: ${error.message}`)
  } else {
    // Primeira conexão Magalu → is_primary = true
    const { count } = await db
      .from('marketplace_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id',     userId)
      .eq('marketplace', 'magalu')
      .eq('connected',   true)

    const { error } = await db
      .from('marketplace_connections')
      .insert({
        user_id:       userId,
        marketplace:   'magalu',
        ml_user_id:    sellerId,
        ml_nickname:   sellerAlias,
        account_label: null,
        access_token:  encAccess,
        refresh_token: encRefresh,
        expires_at:    expiresAt,
        connected:     true,
        is_primary:    (count ?? 0) === 0,
        updated_at:    now,
      })

    if (error) throw new Error(`saveMagaluConnection (insert) falhou: ${error.message}`)
  }

}

// ─── getMagaluConnections ─────────────────────────────────────────────────────

/** Retorna todas as conexões Magalu ativas do usuário */
export async function getMagaluConnections(userId: string): Promise<MagaluConnection[]> {
  const { data } = await supabaseAdmin()
    .from('marketplace_connections')
    .select('*')
    .eq('user_id',     userId)
    .eq('marketplace', 'magalu')
    .eq('connected',   true)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  return (data ?? []) as MagaluConnection[]
}

/** Desconecta uma conta Magalu específica */
export async function disconnectMagaluById(userId: string, connectionId: string): Promise<void> {
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
      .eq('user_id',     userId)
      .eq('marketplace', 'magalu')
      .eq('connected',   true)
      .neq('id',         connectionId)
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
