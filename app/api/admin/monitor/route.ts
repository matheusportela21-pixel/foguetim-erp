/**
 * GET /api/admin/monitor — API health monitor (admin only)
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-guard'

interface PlatformStatus {
  status: 'online' | 'offline'
  connections: number
  lastError: string | null
  tokenExpires: string | null
}

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })
  }

  const sb = supabaseAdmin()

  // --- Mercado Livre ---
  let mercadolivre: PlatformStatus = { status: 'offline', connections: 0, lastError: null, tokenExpires: null }
  try {
    const { data: mlConns, count } = await sb
      .from('marketplace_connections')
      .select('id, access_token_expires_at', { count: 'exact' })
      .eq('platform', 'mercadolivre')
      .eq('status', 'active')

    const mlCount = count ?? mlConns?.length ?? 0

    let mlTokenExpires: string | null = null
    if (mlConns && mlConns.length > 0) {
      const firstWithToken = mlConns.find((c: Record<string, unknown>) => c.access_token_expires_at)
      if (firstWithToken) mlTokenExpires = firstWithToken.access_token_expires_at as string
    }

    const { data: mlErrors } = await sb
      .from('activity_logs')
      .select('description')
      .eq('category', 'integracao')
      .or('action.ilike.%error%,action.ilike.%ml%,description.ilike.%mercado%')
      .order('created_at', { ascending: false })
      .limit(1)

    mercadolivre = {
      status: mlCount > 0 ? 'online' : 'offline',
      connections: mlCount,
      lastError: mlErrors?.[0]?.description ?? null,
      tokenExpires: mlTokenExpires,
    }
  } catch {
    // keep defaults
  }

  // --- Shopee ---
  let shopee: PlatformStatus = { status: 'offline', connections: 0, lastError: null, tokenExpires: null }
  try {
    const { data: spConns, count } = await sb
      .from('marketplace_connections')
      .select('id, access_token_expires_at', { count: 'exact' })
      .eq('platform', 'shopee')
      .eq('status', 'active')

    const spCount = count ?? spConns?.length ?? 0

    let spTokenExpires: string | null = null
    if (spConns && spConns.length > 0) {
      const firstWithToken = spConns.find((c: Record<string, unknown>) => c.access_token_expires_at)
      if (firstWithToken) spTokenExpires = firstWithToken.access_token_expires_at as string
    }

    const { data: spErrors } = await sb
      .from('activity_logs')
      .select('description')
      .eq('category', 'integracao')
      .or('action.ilike.%error%,action.ilike.%shopee%,description.ilike.%shopee%')
      .order('created_at', { ascending: false })
      .limit(1)

    shopee = {
      status: spCount > 0 ? 'online' : 'offline',
      connections: spCount,
      lastError: spErrors?.[0]?.description ?? null,
      tokenExpires: spTokenExpires,
    }
  } catch {
    // keep defaults
  }

  // --- Supabase health ---
  let supabase = { status: 'online' as const, latency: 0 }
  try {
    const t0 = performance.now()
    await sb.from('users').select('id').limit(1)
    supabase = { status: 'online', latency: Math.round(performance.now() - t0) }
  } catch {
    supabase = { status: 'online', latency: -1 }
  }

  // --- Recent errors (24h) ---
  let errors24h: Record<string, unknown>[] = []
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await sb
      .from('activity_logs')
      .select('id, action, category, description, created_at, user_id')
      .in('category', ['integracao', 'sistema', 'error'])
      .or('description.ilike.%erro%,description.ilike.%error%,action.ilike.%error%')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10)

    errors24h = data ?? []
  } catch {
    // keep empty
  }

  // --- System info ---
  const systemInfo = {
    version: '1.0.0-beta',
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    uptime: process.uptime(),
  }

  return NextResponse.json({
    mercadolivre,
    shopee,
    supabase,
    errors24h,
    systemInfo,
  })
}
