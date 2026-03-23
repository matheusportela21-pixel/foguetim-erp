/**
 * POST /api/mercadolivre/items/bulk-action
 * Body: { action: 'pause' | 'reactivate' | 'close', item_ids: string[] }
 *
 * Aplica uma ação em massa em anúncios do ML.
 * Processa em sequência com 300ms de delay para respeitar rate limit.
 * Retorna: { success: string[], failed: string[], total: number }
 */
import { NextResponse }   from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { mlFetch }        from '@/lib/mercadolivre'
import { supabaseAdmin }  from '@/lib/supabase-admin'
import { checkRateLimit, rateLimitKey, rateLimitHeaders } from '@/lib/rate-limit'

type BulkAction = 'pause' | 'reactivate' | 'close'

const STATUS_MAP: Record<BulkAction, string> = {
  pause:      'paused',
  reactivate: 'active',
  close:      'closed',
}

const ACTION_LABEL: Record<BulkAction, string> = {
  pause:      'pausados',
  reactivate: 'reativados',
  close:      'fechados',
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)) }

export async function POST(req: Request) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  // Rate limit: 10 ações em massa por hora por usuário
  const rl = await checkRateLimit(rateLimitKey(dataOwnerId, 'POST:/api/mercadolivre/items/bulk-action'), 10, 3_600_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { status: 429, headers: { ...rateLimitHeaders(rl, 10), 'Retry-After': String(rl.retryAfter) } },
    )
  }

  let action: BulkAction
  let item_ids: string[]

  try {
    const body = await req.json() as { action: BulkAction; item_ids: string[] }
    action   = body.action
    item_ids = body.item_ids
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!['pause', 'reactivate', 'close'].includes(action)) {
    return NextResponse.json({ error: `Ação inválida: ${action}` }, { status: 400 })
  }
  if (!Array.isArray(item_ids) || item_ids.length === 0) {
    return NextResponse.json({ error: 'item_ids deve ser um array não vazio' }, { status: 400 })
  }
  if (item_ids.length > 200) {
    return NextResponse.json({ error: 'Máximo de 200 anúncios por ação em massa' }, { status: 400 })
  }

  const newStatus = STATUS_MAP[action]
  const success: string[] = []
  const failed:  string[] = []

  for (const item_id of item_ids) {
    try {
      await mlFetch(dataOwnerId, `/items/${item_id}`, {
        method: 'PUT',
        body:   JSON.stringify({ status: newStatus }),
      })
      success.push(item_id)
    } catch {
      failed.push(item_id)
    }
    await sleep(300)
  }

  // Log to activity_logs (non-fatal)
  try {
    await supabaseAdmin()
      .from('activity_logs')
      .insert({
        user_id:     dataOwnerId,
        action:      `ml.items.bulk_${action}`,
        category:    'products',
        description: `${success.length} anúncio(s) ${ACTION_LABEL[action]} em massa`,
        metadata:    { action, success_count: success.length, failed_count: failed.length, item_ids },
        visibility:  'user',
      })
  } catch { /* non-fatal */ }

  return NextResponse.json({ success, failed, total: item_ids.length })
}
