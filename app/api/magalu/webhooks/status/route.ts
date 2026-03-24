/**
 * GET /api/magalu/webhooks/status
 * Retorna o status dos webhooks Magalu registrados + últimos eventos recebidos.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet } from '@/lib/magalu/client'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/magalu`
  : 'https://app.foguetim.com.br/api/webhooks/magalu'

export async function GET(_req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  // Buscar registros de webhook Magalu do queue (últimas 24h)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data: recentEvents } = await supabaseAdmin()
    .from('webhook_queue')
    .select('id, topic, resource, status, received_at')
    .eq('user_id', tokenData.sellerId ?? 'magalu')
    .gte('received_at', since)
    .order('received_at', { ascending: false })
    .limit(20)

  // Contar por tópico
  const eventCounts: Record<string, number> = {}
  for (const ev of recentEvents ?? []) {
    const t = String(ev.topic ?? 'unknown')
    eventCounts[t] = (eventCounts[t] ?? 0) + 1
  }

  // Tentar buscar webhooks registrados na API Magalu
  let registeredWebhooks: unknown[] = []
  let apiAvailable = false

  try {
    const data = await magaluGet(
      '/seller/v1/webhooks',
      tokenData.accessToken,
      tokenData.sellerId,
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any
    registeredWebhooks = Array.isArray(raw) ? raw : raw?.items ?? raw?.webhooks ?? []
    apiAvailable = true
  } catch {
    // API não disponível neste escopo — não é crítico
  }

  const isRegistered = registeredWebhooks.some(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (w: any) => w?.url?.includes('foguetim') || w?.url === WEBHOOK_URL
  )

  return NextResponse.json({
    webhook_url:   WEBHOOK_URL,
    api_available: apiAvailable,
    registered:    apiAvailable ? isRegistered : null,
    registered_webhooks: registeredWebhooks,
    recent_events: recentEvents ?? [],
    event_counts:  eventCounts,
    total_24h:     (recentEvents ?? []).length,
  })
}
