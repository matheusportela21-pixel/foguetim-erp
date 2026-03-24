/**
 * GET /api/magalu/chat/conversations
 * Lista conversas com clientes via Magalu Chat API.
 * Tenta /seller/v1/conversations — se 403/404, retorna fallback vazio.
 *
 * POST /api/magalu/chat/conversations
 * Envia mensagem em uma conversa existente.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { getValidMagaluToken } from '@/lib/magalu/auth'
import { magaluGet, magaluPost } from '@/lib/magalu/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  const sp         = new URL(req.url).searchParams
  const offset     = sp.get('offset') ?? '0'
  const limit      = sp.get('limit') ?? '20'
  const status     = sp.get('status')
  const channel    = sp.get('channel')

  try {
    const params: Record<string, string> = { offset, limit }
    if (status)  params.status  = status
    if (channel) params.channel = channel

    const data = await magaluGet(
      '/seller/v1/conversations',
      tokenData.accessToken,
      tokenData.sellerId,
      params,
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data as any
    const items = Array.isArray(raw) ? raw
      : raw?.items ?? raw?.results ?? raw?.data ?? raw?.conversations ?? []
    const total = raw?.meta?.total ?? raw?.total ?? items.length

    return NextResponse.json({ items, total, available: true })
  } catch (err) {
    console.warn('[Magalu Chat] conversations endpoint error:', err)
    return NextResponse.json({
      items: [],
      total: 0,
      available: false,
      message: 'Chat endpoint não disponível neste escopo de API',
    })
  }
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  const tokenData = await getValidMagaluToken(dataOwnerId)
  if (!tokenData) return NextResponse.json({ error: 'Magalu não conectado' }, { status: 400 })

  try {
    const body = await req.json() as { conversation_id: string; message: string }
    if (!body.conversation_id || !body.message) {
      return NextResponse.json({ error: 'conversation_id e message são obrigatórios' }, { status: 400 })
    }

    const result = await magaluPost(
      `/seller/v1/conversations/${body.conversation_id}/messages`,
      { content: body.message },
      tokenData.accessToken,
      tokenData.sellerId,
    )

    return NextResponse.json({ ok: true, data: result })
  } catch (err) {
    console.warn('[Magalu Chat] send message error:', err)
    return NextResponse.json({ error: 'Não foi possível enviar a mensagem' }, { status: 503 })
  }
}
