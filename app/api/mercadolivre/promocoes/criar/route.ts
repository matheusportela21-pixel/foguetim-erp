/**
 * POST /api/mercadolivre/promocoes/criar
 * Cria nova campanha de desconto do vendedor.
 * POST /seller-promotions/promotions?app_version=v2
 *
 * Body: { name, start_date, finish_date }
 * Requisito: prazo máximo 14 dias entre start_date e finish_date.
 */
import { NextRequest, NextResponse }  from 'next/server'
import { resolveDataOwner }           from '@/lib/auth/api-permissions'
import { getMLConnection, mlFetch }   from '@/lib/mercadolivre'
import { supabaseAdmin }              from '@/lib/supabase-admin'
import { checkRateLimit, rateLimitKey, rateLimitHeaders } from '@/lib/rate-limit'

interface CreateBody {
  name:        string
  start_date:  string // ISO 8601
  finish_date: string // ISO 8601
}

interface MLCreateResponse {
  id:     string
  status: string
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error } = await resolveDataOwner()
  if (error) return error

  // Rate limit: 10 campanhas criadas por hora por usuário
  const rl = await checkRateLimit(rateLimitKey(dataOwnerId, 'POST:/api/mercadolivre/promocoes/criar'), 10, 3_600_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { status: 429, headers: { ...rateLimitHeaders(rl, 10), 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const conn = await getMLConnection(dataOwnerId)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'Mercado Livre não conectado' }, { status: 400 })
  }

  const body = await req.json() as Partial<CreateBody>
  const { name, start_date, finish_date } = body

  if (!name?.trim() || !start_date || !finish_date) {
    return NextResponse.json({ error: 'name, start_date e finish_date são obrigatórios' }, { status: 400 })
  }

  // Validar prazo máximo de 14 dias
  const diffMs   = new Date(finish_date).getTime() - new Date(start_date).getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays > 14) {
    return NextResponse.json({ error: 'O prazo máximo de uma campanha é 14 dias' }, { status: 400 })
  }
  if (diffDays <= 0) {
    return NextResponse.json({ error: 'A data de término deve ser após a data de início' }, { status: 400 })
  }

  try {
    const data = await mlFetch<MLCreateResponse>(
      dataOwnerId,
      '/seller-promotions/promotions?app_version=v2',
      {
        method: 'POST',
        body:   JSON.stringify({
          promotion_type: 'SELLER_CAMPAIGN',
          sub_type:       'FLEXIBLE_PERCENTAGE',
          name:           name.trim(),
          start_date,
          finish_date,
        }),
      },
    )

    void supabaseAdmin().from('activity_logs').insert({
      user_id:     dataOwnerId,
      action:      'ml.promocao.criar',
      category:    'integracao',
      description: `Campanha criada: "${name.trim()}" (${start_date.slice(0,10)} → ${finish_date.slice(0,10)})`,
      metadata:    { promotion_id: data.id, name, start_date, finish_date },
      visibility:  'user',
    })

    return NextResponse.json({ ok: true, promotion_id: data.id, status: data.status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[promocoes/criar] POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
