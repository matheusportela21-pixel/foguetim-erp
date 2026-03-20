/**
 * GET /api/mercadolivre/messages
 * Lista mensagens pós-venda não lidas agrupadas por pack.
 */
import { NextResponse }  from 'next/server'
import { getAuthUser }   from '@/lib/server-auth'
import { mlFetch }       from '@/lib/mercadolivre'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface UnreadPack {
  pack_id:    number
  order_id?:  number
  unread:     number
}

interface MLMessage {
  id:           string
  from:         { user_id: number }
  to:           { user_id: number }
  text:         { plain: string }
  message_date: { received: string }
  message_type: string
  status:       string
}

interface MLConversation {
  pack_id:          number
  order_id?:        number
  messages:         MLMessage[]
  conversation_status?: { blocked?: boolean }
  participants?: { seller_id: number; buyer_id: number }
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Buscar conexão ML do usuário
    const { data: conn } = await supabaseAdmin()
      .from('marketplace_connections')
      .select('ml_user_id')
      .eq('user_id', user.id)
      .eq('marketplace', 'mercadolivre')
      .eq('connected', true)
      .maybeSingle()

    if (!conn) return NextResponse.json({ messages: [], total_unread: 0 })

    const mlUserId = String(conn.ml_user_id ?? '')
    if (!mlUserId) return NextResponse.json({ messages: [], total_unread: 0 })

    // 2. Buscar packs com mensagens não lidas
    let unreadPacks: UnreadPack[] = []
    try {
      const unreadRes = await mlFetch<{ results: UnreadPack[] }>(
        user.id,
        `/messages/unread?role=seller&tag=post_sale`
      )
      unreadPacks = unreadRes.results ?? []
    } catch {
      return NextResponse.json({ messages: [], total_unread: 0 })
    }

    if (unreadPacks.length === 0) {
      return NextResponse.json({ messages: [], total_unread: 0 })
    }

    // 3. Buscar histórico dos primeiros 10 packs (respeitar rate limit)
    const packsToFetch = unreadPacks.slice(0, 10)
    const conversations = await Promise.allSettled(
      packsToFetch.map(p =>
        mlFetch<MLConversation>(
          user.id,
          `/messages/packs/${p.pack_id}/sellers/${mlUserId}?tag=post_sale&mark_as_read=false`
        )
      )
    )

    const results = conversations
      .map((res, i) => {
        if (res.status !== 'fulfilled') return null
        const conv    = res.value
        const pack    = packsToFetch[i]
        const msgs    = conv.messages ?? []
        const lastMsg = msgs[msgs.length - 1]

        return {
          pack_id:     conv.pack_id ?? pack.pack_id,
          order_id:    conv.order_id ?? pack.order_id ?? null,
          unread:      pack.unread,
          last_message: lastMsg ? {
            text:        lastMsg.text?.plain ?? '',
            date:        lastMsg.message_date?.received ?? '',
            from_buyer:  lastMsg.from?.user_id !== Number(mlUserId),
          } : null,
          blocked:     conv.conversation_status?.blocked ?? false,
          buyer_id:    conv.participants?.buyer_id ?? null,
        }
      })
      .filter(Boolean)

    const totalUnread = unreadPacks.reduce((sum, p) => sum + (p.unread ?? 0), 0)

    return NextResponse.json({
      messages:     results,
      total_unread: totalUnread,
      has_more:     unreadPacks.length > 10,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[messages GET]', msg)
    return NextResponse.json({ messages: [], total_unread: 0 })
  }
}
