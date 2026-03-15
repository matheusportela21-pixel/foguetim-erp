/**
 * GET   /api/mercadolivre/items/[item_id] — detalhes completos do anúncio (inclui descrição)
 * PATCH /api/mercadolivre/items/[item_id] — editar campo por campo com validação
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }                 from '@/lib/server-auth'
import { mlFetch }                     from '@/lib/mercadolivre'
import { supabaseAdmin }               from '@/lib/supabase-admin'

type Params = { params: { item_id: string } }

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function mlErrorMessage(errText: string, status: number): string {
  if (status === 400) return `Campo inválido: ${errText}`
  if (status === 403) return 'Sem permissão para editar este anúncio'
  if (status === 404) return 'Anúncio não encontrado'
  if (status === 409) return 'Conflito: aguarde alguns segundos e tente novamente'
  return `Erro ${status}: ${errText}`
}

/** Rate-limit: wait at least 1s between PUT calls per user */
const lastPut: Map<string, number> = new Map()
async function enforceRateLimit(userId: string) {
  const now  = Date.now()
  const last = lastPut.get(userId) ?? 0
  const wait = 1000 - (now - last)
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastPut.set(userId, Date.now())
}

/* ── GET ─────────────────────────────────────────────────────────────────── */
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = params

  try {
    const [item, desc] = await Promise.allSettled([
      mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`),
      mlFetch<{ plain_text: string }>(user.id, `/items/${item_id}/description`),
    ])

    const itemData = item.status === 'fulfilled' ? item.value : null
    const descText = desc.status === 'fulfilled' ? desc.value?.plain_text ?? '' : ''

    if (!itemData) {
      throw new Error('Falha ao carregar o anúncio')
    }

    return NextResponse.json({ ...itemData, description_text: descText })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[items GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────────────────────── */
type PatchField = 'title' | 'price' | 'stock' | 'status' | 'description'

interface PatchBody {
  field: PatchField
  value: unknown
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { item_id } = params
  let body: PatchBody
  try {
    body = await req.json() as PatchBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { field, value } = body

  /* ── Validações por campo ──────────────────────────────────────────────── */
  if (field === 'price') {
    if (typeof value !== 'number' || value <= 0) {
      return NextResponse.json({ error: 'Preço deve ser maior que zero' }, { status: 400 })
    }
  }
  if (field === 'stock') {
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
      return NextResponse.json({ error: 'Estoque deve ser um número inteiro não-negativo' }, { status: 400 })
    }
  }
  if (field === 'title') {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json({ error: 'Título não pode ser vazio' }, { status: 400 })
    }
    // Check if item has sales (title change may be blocked by ML)
    try {
      const item = await mlFetch<{ sold_quantity: number }>(user.id, `/items/${item_id}`)
      if (item.sold_quantity > 0) {
        // Still allow but warn — ML may reject it
        console.warn(`[items PATCH] title change on item ${item_id} with ${item.sold_quantity} sales`)
      }
    } catch {
      // If we can't fetch, proceed anyway
    }
  }
  if (field === 'status') {
    if (value !== 'active' && value !== 'paused') {
      return NextResponse.json({ error: 'Status deve ser active ou paused' }, { status: 400 })
    }
  }
  if (field === 'description') {
    if (typeof value !== 'string') {
      return NextResponse.json({ error: 'Descrição inválida' }, { status: 400 })
    }
  }

  await enforceRateLimit(user.id)

  try {
    let updatedItem: Record<string, unknown>

    if (field === 'description') {
      // Description uses a different endpoint
      await mlFetch(user.id, `/items/${item_id}/description?api_version=2`, {
        method: 'PUT',
        body: JSON.stringify({ plain_text: String(value) }),
      })
      // Fetch full item to return
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`)
    } else {
      const payload: Record<string, unknown> = {
        title:              field === 'title'  ? String(value)  : undefined,
        price:              field === 'price'  ? Number(value)  : undefined,
        available_quantity: field === 'stock'  ? Number(value)  : undefined,
        status:             field === 'status' ? String(value)  : undefined,
      }
      // Remove undefined keys
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k]
      }
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    }

    // Log to activity_logs via supabaseAdmin
    const fieldLabels: Record<PatchField, string> = {
      title:       'título',
      price:       'preço',
      stock:       'estoque',
      status:      'status',
      description: 'descrição',
    }
    await supabaseAdmin()
      .from('activity_logs')
      .insert({
        user_id:     user.id,
        action:      'ml.item.updated',
        category:    'products',
        description: `Anúncio ${item_id} atualizado: ${fieldLabels[field]} alterado`,
        metadata:    { item_id, field, value },
        visibility:  'user',
      })

    return NextResponse.json({ ok: true, item: updatedItem })
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err)
    // Parse status code from mlFetch error format: "ML API 400 em /items/..."
    const statusMatch = raw.match(/ML API (\d+)/)
    const statusCode  = statusMatch ? parseInt(statusMatch[1], 10) : 500
    const friendly    = mlErrorMessage(raw, statusCode)
    console.error('[items PATCH]', raw)
    return NextResponse.json({ error: friendly }, { status: Math.min(statusCode, 500) })
  }
}
