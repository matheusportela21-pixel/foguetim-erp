/**
 * GET /api/magalu/diagnostico
 * Testa TODOS os endpoints Magalu e retorna relatório de status.
 * Usado para diagnóstico — quais endpoints funcionam, quais dão 403/404, etc.
 *
 * ROTA TEMPORÁRIA — remover após diagnóstico.
 * Usa service role key para pegar token direto do DB (sem precisar de sessão do user).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMagaluBaseUrl } from '@/lib/magalu/config'
import { decrypt } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

const ENDPOINTS = [
  { name: 'Produtos (SKUs)',    path: '/seller/v1/portfolios/skus',            params: '_limit=3' },
  { name: 'Produtos (limit)',   path: '/seller/v1/portfolios/skus',            params: 'limit=3' },
  { name: 'Pedidos',            path: '/seller/v1/orders',                     params: '_limit=3' },
  { name: 'Pedidos (limit)',    path: '/seller/v1/orders',                     params: 'limit=3' },
  { name: 'SAC Tickets (v0)',   path: '/seller/v0/tickets',                    params: '_limit=3' },
  { name: 'Perguntas (v0)',     path: '/v0/questions',                         params: '_limit=3' },
  { name: 'Chat Conversas',     path: '/seller/v1/conversations',              params: '_limit=3' },
  { name: 'Scores Saúde',       path: '/seller/v1/portfolios/products/scores', params: '_limit=3' },
  { name: 'Entregas/Logística', path: '/seller/v1/deliveries',                 params: '_limit=3' },
  // Alternativas
  { name: 'SAC Tickets (v1)',   path: '/seller/v1/tickets',                    params: '_limit=3' },
  { name: 'Perguntas (seller)', path: '/seller/v0/questions',                  params: '_limit=3' },
  { name: 'Chat (v0)',          path: '/v0/conversations',                     params: '_limit=3' },
]

export async function GET() {
  // Usar service role para pegar token direto do DB
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 })
  }

  const sb = createClient(supabaseUrl, serviceRoleKey)

  // Buscar conexão Magalu ativa
  const { data: conn } = await sb
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'magalu')
    .eq('connected', true)
    .limit(1)
    .single()

  if (!conn) {
    return NextResponse.json({ error: 'Nenhuma conexão Magalu ativa encontrada' }, { status: 404 })
  }

  let accessToken: string
  try {
    accessToken = await decrypt(conn.access_token)
  } catch {
    return NextResponse.json({ error: 'Falha ao decriptar access_token' }, { status: 500 })
  }

  const sellerId = conn.ml_user_id // seller_id stored in ml_user_id field
  const baseUrl = getMagaluBaseUrl()
  const results = []

  for (const ep of ENDPOINTS) {
    const url = `${baseUrl}${ep.path}?${ep.params}`
    try {
      const start = Date.now()
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-Id': sellerId,
        },
      })

      const body = await res.text()
      const ms = Date.now() - start

      results.push({
        name: ep.name,
        path: ep.path,
        url,
        status: res.status,
        ok: res.ok,
        ms,
        bodyPreview: body.substring(0, 1200),
        contentType: res.headers.get('content-type'),
      })
    } catch (err) {
      results.push({
        name: ep.name,
        path: ep.path,
        url,
        status: 'NETWORK_ERROR',
        ok: false,
        error: String(err),
      })
    }
  }

  // Resumo
  const summary = results.map(r => {
    const icon = r.ok ? '✅' : r.status === 403 ? '🔒' : r.status === 404 ? '❌' : '⚠️'
    return `${icon} ${r.name}: ${r.status} (${r.path})`
  }).join('\n')

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    baseUrl,
    sellerId,
    sellerName: conn.ml_nickname,
    tokenExpiresAt: conn.expires_at,
    summary,
    results,
  })
}
