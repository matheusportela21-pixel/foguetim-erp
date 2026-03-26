/**
 * GET /api/messages/inbox?channel=all|ml|magalu&status=all|unread&type=all|question|sac
 * Aggregates: ML questions + ML post-sale messages (+ Magalu SAC when available)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }         from '@/lib/auth/api-permissions'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'

export interface InboxMessage {
  id:        string
  channel:   'ml' | 'magalu'
  type:      'question' | 'sac' | 'message'
  from:      string
  fromName:  string | null
  subject:   string
  preview:   string
  date:      string
  read:      boolean
  status:    string
  itemId:    string | null
  orderId:   string | null
  replyUrl:  string | null
}

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('messages:view')
  if (authError) return authError

  const sp      = new URL(req.url).searchParams
  const channel = sp.get('channel') ?? 'all'
  const status  = sp.get('status')  ?? 'all'
  const type    = sp.get('type')    ?? 'all'

  const messages: InboxMessage[] = []

  // ── ML Questions + Messages ─────────────────────────────────────────────
  if (channel === 'all' || channel === 'ml') {
    const conn = await getMLConnection(dataOwnerId)
    if (conn?.connected) {
      const token = await getValidToken(dataOwnerId)
      if (token) {
        const auth = { Authorization: `Bearer ${token}` }

        // 1) Questions — try /my/received_questions first, fallback to /questions/search
        try {
          let qData: { questions?: Record<string, unknown>[]; total?: number } | null = null

          const qRes1 = await fetch(
            `${ML_API_BASE}/my/received_questions/search?seller_id=${conn.ml_user_id}&sort_fields=date_created&sort_types=DESC&limit=20`,
            { headers: auth },
          )
          if (qRes1.ok) {
            qData = await qRes1.json()
          } else {
            // Fallback endpoint
            const qRes2 = await fetch(
              `${ML_API_BASE}/questions/search?seller_id=${conn.ml_user_id}&sort_fields=date_created&sort_types=DESC&limit=20`,
              { headers: auth },
            )
            if (qRes2.ok) {
              qData = await qRes2.json()
            }
          }

          if (qData?.questions) {
            for (const q of qData.questions) {
              const qId   = q.id as number
              const text   = (q.text as string) ?? ''
              const status_ = (q.status as string) ?? 'UNANSWERED'
              const itemId  = (q.item_id as string) ?? null
              const from_   = q.from as Record<string, unknown> | undefined

              messages.push({
                id:       `ml-q-${qId}`,
                channel:  'ml',
                type:     'question',
                from:     from_?.id ? String(from_.id) : 'Comprador',
                fromName: null,
                subject:  text.substring(0, 80) || 'Pergunta',
                preview:  text,
                date:     (q.date_created as string) ?? new Date().toISOString(),
                read:     status_ === 'ANSWERED',
                status:   status_,
                itemId,
                orderId:  null,
                replyUrl: `https://www.mercadolivre.com.br/perguntas/${qId}`,
              })
            }
          }
        } catch {
          // Silently ignore — questions might not be available
        }

        // 2) Post-sale messages (from orders messaging)
        try {
          const mRes = await fetch(
            `${ML_API_BASE}/messages/unread?user_id=${conn.ml_user_id}&role=seller`,
            { headers: auth },
          )
          if (mRes.ok) {
            const mData = await mRes.json() as { results?: Record<string, unknown>[] }
            for (const m of mData.results ?? []) {
              const mId    = m.id as string
              const text   = ((m.text as Record<string, unknown>)?.plain as string) ?? (m.text as string) ?? ''
              const from_  = m.from as Record<string, unknown> | undefined
              const resource = m.resource as string | undefined

              messages.push({
                id:       `ml-m-${mId}`,
                channel:  'ml',
                type:     'message',
                from:     from_?.user_id ? String(from_.user_id) : 'Comprador',
                fromName: null,
                subject:  text.substring(0, 80) || 'Mensagem',
                preview:  text,
                date:     (m.date_created as string) ?? new Date().toISOString(),
                read:     false,
                status:   'UNREAD',
                itemId:   null,
                orderId:  resource ?? null,
                replyUrl: null,
              })
            }
          }
        } catch {
          // Silently ignore
        }
      }
    }
  }

  // ── Magalu SAC (placeholder — not yet integrated) ──────────────────────
  // Will be added when Magalu messaging API is available

  // ── Sort by date desc ──────────────────────────────────────────────────
  messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // ── Filter by type ─────────────────────────────────────────────────────
  let filtered = type !== 'all'
    ? messages.filter(m => m.type === type)
    : messages

  // ── Filter by status ───────────────────────────────────────────────────
  if (status === 'unread') {
    filtered = filtered.filter(m => !m.read)
  }

  return NextResponse.json({
    messages: filtered,
    total:    filtered.length,
    unread:   messages.filter(m => !m.read).length,
  })
}
