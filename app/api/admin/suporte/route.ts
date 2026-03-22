/**
 * GET /api/admin/suporte — ferramentas de suporte
 * ?action=search&q=<term>  — busca usuarios por nome/email
 * ?action=health           — health check do sistema
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-guard'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const sp     = new URL(req.url).searchParams
  const action = sp.get('action') ?? ''

  if (action === 'search') return handleSearch(sp)
  if (action === 'health') return handleHealth()

  return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
}

/* ------------------------------------------------------------------ */
/*  Search users                                                       */
/* ------------------------------------------------------------------ */
async function handleSearch(sp: URLSearchParams) {
  const q = (sp.get('q') ?? '').trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Termo de busca muito curto (min 2 chars)' }, { status: 400 })
  }

  const sb = supabaseAdmin()

  // 1) Search users
  const { data: users, error: usersErr } = await sb
    .from('users')
    .select('id, name, email, plan, role, created_at, cancelled_at')
    .or(`email.ilike.%${q}%,name.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (usersErr) {
    return NextResponse.json({ error: usersErr.message }, { status: 500 })
  }
  if (!users || users.length === 0) {
    return NextResponse.json({ users: [] })
  }

  const userIds = users.map((u) => u.id)

  // 2) Marketplace connections count per user
  const { data: connections } = await sb
    .from('marketplace_connections')
    .select('user_id, marketplace')
    .in('user_id', userIds)

  // 3) Warehouse products count per user
  const { data: products } = await sb
    .from('warehouse_products')
    .select('user_id')
    .in('user_id', userIds)

  // 4) Last activity per user
  const { data: activities } = await sb
    .from('activity_log')
    .select('user_id, created_at, action')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })

  // Build lookup maps
  const connMap = new Map<string, string[]>()
  for (const c of connections ?? []) {
    const list = connMap.get(c.user_id) ?? []
    list.push(c.marketplace)
    connMap.set(c.user_id, list)
  }

  const prodCount = new Map<string, number>()
  for (const p of products ?? []) {
    prodCount.set(p.user_id, (prodCount.get(p.user_id) ?? 0) + 1)
  }

  const lastActivity = new Map<string, { created_at: string; action: string }>()
  for (const a of activities ?? []) {
    if (!lastActivity.has(a.user_id)) {
      lastActivity.set(a.user_id, { created_at: a.created_at, action: a.action })
    }
  }

  // Enrich users
  const enriched = users.map((u) => ({
    ...u,
    marketplaces: connMap.get(u.id) ?? [],
    marketplace_count: (connMap.get(u.id) ?? []).length,
    product_count: prodCount.get(u.id) ?? 0,
    last_activity: lastActivity.get(u.id) ?? null,
  }))

  return NextResponse.json({ users: enriched })
}

/* ------------------------------------------------------------------ */
/*  Health check                                                       */
/* ------------------------------------------------------------------ */
async function handleHealth() {
  const sb = supabaseAdmin()
  const now = new Date().toISOString()

  // Supabase connection test
  let supabaseStatus: 'ok' | 'error' = 'ok'
  try {
    const { error } = await sb.from('users').select('id').limit(1)
    if (error) supabaseStatus = 'error'
  } catch {
    supabaseStatus = 'error'
  }

  // ML token status
  let mlActive = 0
  let mlExpiring = 0
  try {
    const { data: mlConns } = await sb
      .from('marketplace_connections')
      .select('id, access_token_expires_at')
      .eq('marketplace', 'mercadolivre')

    for (const c of mlConns ?? []) {
      if (c.access_token_expires_at && c.access_token_expires_at < now) {
        mlExpiring++
      } else {
        mlActive++
      }
    }
  } catch { /* ignore */ }

  // Shopee token status
  let shopeeActive = 0
  let shopeeExpiring = 0
  try {
    const { data: spConns } = await sb
      .from('marketplace_connections')
      .select('id, access_token_expires_at')
      .eq('marketplace', 'shopee')

    for (const c of spConns ?? []) {
      if (c.access_token_expires_at && c.access_token_expires_at < now) {
        shopeeExpiring++
      } else {
        shopeeActive++
      }
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    supabase: supabaseStatus,
    ml: { active: mlActive, expiring: mlExpiring },
    shopee: { active: shopeeActive, expiring: shopeeExpiring },
    lastCron: null,
  })
}
