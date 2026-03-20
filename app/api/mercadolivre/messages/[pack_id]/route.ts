/**
 * GET  /api/mercadolivre/messages/[pack_id] — histórico da conversa
 * POST /api/mercadolivre/messages/[pack_id] — responder mensagem
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'
import { supabaseAdmin }             from '@/lib/supabase-admin'

type Params = { params: { pack_id: string } }

async function getMLUserId(userId: string): Promise<string | null> {
  const { data: conn } = await supabaseAdmin()
    .from('marketplace_connections')
    .select('ml_user_id')
    .eq('user_id', userId)
    .eq('marketplace', 'mercadolivre')
    .eq('connected', true)
    .maybeSingle()

  if (!conn) return null
  return conn.ml_user_id ? String(conn.ml_user_id) : null
}

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pack_id } = params
  const mlUserId    = await getMLUserId(user.id)
  if (!mlUserId) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

  try {
    const data = await mlFetch(
      user.id,
      `/messages/packs/${pack_id}/sellers/${mlUserId}?tag=post_sale&mark_as_read=false`
    )
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[messages/[pack_id] GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* ── POST ────────────────────────────────────────────────────────────────── */
interface PostBody {
  text:     string
  buyer_id: string
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pack_id } = params
  const mlUserId    = await getMLUserId(user.id)
  if (!mlUserId) return NextResponse.json({ error: 'ML não conectado' }, { status: 400 })

  let body: PostBody
  try {
    body = await req.json() as PostBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { text, buyer_id } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Mensagem não pode ser vazia' }, { status: 400 })
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Mensagem muito longa (máximo 2000 caracteres)' }, { status: 400 })
  }
  if (!buyer_id) {
    return NextResponse.json({ error: 'buyer_id é obrigatório' }, { status: 400 })
  }

  try {
    const result = await mlFetch(
      user.id,
      `/messages/packs/${pack_id}/sellers/${mlUserId}?tag=post_sale`,
      {
        method: 'POST',
        body: JSON.stringify({
          from: { user_id: Number(mlUserId) },
          to:   { user_id: Number(buyer_id) },
          text: { plain: text.trim() },
        }),
      }
    )

    // Log em activity_logs
    void supabaseAdmin().from('activity_logs').insert({
      user_id:     user.id,
      action:      'ml.message.sent',
      category:    'orders',
      description: `Mensagem enviada no pack ${pack_id}`,
      metadata:    { pack_id, buyer_id, chars: text.length },
      visibility:  'user',
    })

    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[messages/[pack_id] POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
