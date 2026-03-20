/**
 * GET  /api/mercadolivre/questions  — lista perguntas do vendedor
 * POST /api/mercadolivre/questions  — [REQUER CONFIRMAÇÃO MANUAL] responde pergunta
 *
 * Query params (GET):
 *   status  UNANSWERED | ANSWERED | all (default: UNANSWERED)
 *   limit   (default: 50)
 *   offset  (default: 0)
 *
 * SEGURANÇA: POST só deve ser chamado após confirmação explícita do usuário.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { checkRateLimit, rateLimitKey, rateLimitHeaders } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 200 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido — reconecte o ML' }, { status: 401 })

  const sp     = new URL(req.url).searchParams
  const status = sp.get('status') ?? 'UNANSWERED'
  const limit  = Math.min(Number(sp.get('limit') ?? 50), 50)
  const offset = Number(sp.get('offset') ?? 0)

  const auth = { Authorization: `Bearer ${token}` }

  try {
    const statusParam = status === 'all' ? '' : `&status=${status}`
    const url = `${ML_API_BASE}/questions/search?seller_id=${conn.ml_user_id}&role=seller&sort_fields=date_created&sort_types=DESC&limit=${limit}&offset=${offset}${statusParam}`
    const res = await fetch(url, { headers: auth })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`ML questions (${res.status}): ${txt}`)
    }
    const data = await res.json()
    const rawQuestions: Record<string, unknown>[] = data.questions ?? []

    // Collect unique item_ids to batch-fetch item info
    const itemIds = Array.from(new Set(rawQuestions.map(q => q.item_id as string).filter(Boolean)))
    const itemMap: Record<string, { title: string; thumbnail: string }> = {}

    if (itemIds.length > 0) {
      // batch in groups of 20
      for (let i = 0; i < itemIds.length; i += 20) {
        const batch = itemIds.slice(i, i + 20).join(',')
        try {
          const ir = await fetch(`${ML_API_BASE}/items?ids=${batch}&attributes=id,title,thumbnail`, { headers: auth })
          if (ir.ok) {
            const entries: { code: number; body: Record<string, unknown> }[] = await ir.json()
            for (const e of entries) {
              if (e.code === 200 && e.body?.id) {
                itemMap[e.body.id as string] = {
                  title:     (e.body.title as string) ?? '',
                  thumbnail: (e.body.thumbnail as string) ?? '',
                }
              }
            }
          }
        } catch { /* silently skip item enrichment if fails */ }
      }
    }

    const questions = rawQuestions.map(q => {
      const answer = q.answer as Record<string, unknown> | null
      const from   = q.from as Record<string, unknown>  | null
      return {
        id:           q.id,
        text:         q.text,
        date_created: q.date_created,
        status:       q.status,
        item_id:      q.item_id,
        item:         itemMap[q.item_id as string] ?? null,
        from:         from ? { id: from.id, answered_questions: from.answered_questions } : null,
        answer:       answer ? { text: answer.text, date_created: answer.date_created, status: answer.status } : null,
      }
    })

    return NextResponse.json({ questions, paging: data.paging ?? { total: 0, offset, limit } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ML questions GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/mercadolivre/questions
 * SEGURANÇA: Este endpoint SÓ deve ser chamado após confirmação explícita do usuário
 * com diálogo "Tem certeza que deseja responder esta pergunta?"
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 60 respostas por hora por usuário
  const rl = await checkRateLimit(rateLimitKey(user.id, 'POST:/api/mercadolivre/questions'), 60, 3_600_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente mais tarde.' },
      { status: 429, headers: { ...rateLimitHeaders(rl, 60), 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const { question_id, text } = await req.json()
  if (!question_id || !text) {
    return NextResponse.json({ error: 'question_id e text são obrigatórios' }, { status: 400 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const res = await fetch(`${ML_API_BASE}/answers`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question_id, text }),
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`ML answers (${res.status}): ${txt}`)
    }
    return NextResponse.json(await res.json())
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
