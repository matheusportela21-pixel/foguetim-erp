/**
 * GET /api/mercadolivre/ads/advertiser
 * Busca o advertiser_id do usuário conectado ao ML Product Ads.
 * Tenta 2 endpoints em fallback para cobrir variações da API ML.
 */
import { NextResponse }             from 'next/server'
import { getAuthUser }              from '@/lib/server-auth'
import { getMLConnection, getValidToken } from '@/lib/mercadolivre'

const ML_ADS = 'https://api.mercadolibre.com/advertising/MLB'
const ADS_HEADERS = { 'api-version': '2' }

interface AdvertiserResult {
  advertiser_id:   number
  advertiser_name: string
  account_name:    string
  site_id:         string
}

interface AdvertiserSearchResponse {
  results?:        AdvertiserResult[]
  advertiser_id?:  number
  advertiser_name?: string
  account_name?:   string
  site_id?:        string
  message?:        string
  error?:          string
  status?:         number
}

async function adsFetch(token: string, url: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}`, ...ADS_HEADERS },
  })
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const mlUserId = conn.ml_user_id
  console.log('[Ads/advertiser] ML User ID:', mlUserId)

  // ── Tentativa 1: search por user_id ────────────────────────────────────
  let res = await adsFetch(token, `${ML_ADS}/advertisers/search?user_id=${mlUserId}`)
  let rawText = await res.text()
  console.log('[Ads/advertiser] search status:', res.status, '| body:', rawText)

  let data: AdvertiserSearchResponse = {}
  try { data = JSON.parse(rawText) as AdvertiserSearchResponse } catch { /* empty */ }

  // ── Tentativa 2: buscar direto pelo ml_user_id como advertiser_id ──────
  if (!res.ok || (!data.results?.length && !data.advertiser_id)) {
    console.log('[Ads/advertiser] search falhou, tentando direto pelo user_id…')
    res = await adsFetch(token, `${ML_ADS}/advertisers/${mlUserId}`)
    rawText = await res.text()
    console.log('[Ads/advertiser] direct status:', res.status, '| body:', rawText)
    try { data = JSON.parse(rawText) as AdvertiserSearchResponse } catch { /* empty */ }
  }

  // ── Extrair advertiser ─────────────────────────────────────────────────
  const advertiser: AdvertiserResult | undefined =
    Array.isArray(data.results) && data.results.length > 0
      ? data.results[0]
      : (data.advertiser_id ? (data as unknown as AdvertiserResult) : undefined)

  if (!advertiser) {
    return NextResponse.json(
      {
        error:   'NO_ADS_ACCOUNT',
        message: 'Ative o Product Ads no ML primeiro',
        debug:   { mlUserId, lastStatus: res.status, lastBody: rawText.slice(0, 500) },
      },
      { status: 200 }, // 200 para a página poder ler o debug
    )
  }

  return NextResponse.json({
    ...advertiser,
    debug: { mlUserId, status: res.status },
  })
}
