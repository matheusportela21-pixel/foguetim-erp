/**
 * GET   /api/mercadolivre/items/[item_id] — detalhes completos do anúncio (inclui descrição)
 * PATCH /api/mercadolivre/items/[item_id] — editar campo por campo com validação
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }                from '@/lib/server-auth'
import { mlFetch }                    from '@/lib/mercadolivre'
import { supabaseAdmin }              from '@/lib/supabase-admin'

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

    if (!itemData) throw new Error('Falha ao carregar o anúncio')

    return NextResponse.json({ ...itemData, description_text: descText })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[items GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* ── PATCH ───────────────────────────────────────────────────────────────── */
type PatchField =
  | 'title'
  | 'price'
  | 'stock'
  | 'status'
  | 'description'
  | 'listing_type_id'
  | 'condition'
  | 'seller_custom_field'
  | 'free_shipping'
  | 'flex_shipping'
  | 'local_pick_up'
  | 'attributes'
  | 'warranty'
  | 'pictures'

interface PatchBody {
  field: PatchField
  value: unknown
}

const VALID_FIELDS: PatchField[] = [
  'title', 'price', 'stock', 'status', 'description',
  'listing_type_id', 'condition', 'seller_custom_field',
  'free_shipping', 'flex_shipping', 'local_pick_up', 'attributes',
  'warranty', 'pictures',
]

const ALLOWED_LISTING_TYPES = ['gold_pro', 'gold_special', 'free']
const ALLOWED_CONDITIONS     = ['new', 'used', 'not_specified']

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

  if (!VALID_FIELDS.includes(field)) {
    return NextResponse.json({ error: `Campo inválido: ${field}` }, { status: 400 })
  }

  /* ── Validações por campo ──────────────────────────────────────────────── */
  if (field === 'price') {
    if (typeof value !== 'number' || value <= 0)
      return NextResponse.json({ error: 'Preço deve ser maior que zero' }, { status: 400 })
  }
  if (field === 'stock') {
    if (typeof value !== 'number' || value < 0 || !Number.isInteger(value))
      return NextResponse.json({ error: 'Estoque deve ser um número inteiro não-negativo' }, { status: 400 })
  }
  if (field === 'title') {
    if (typeof value !== 'string' || value.trim().length === 0)
      return NextResponse.json({ error: 'Título não pode ser vazio' }, { status: 400 })
  }
  if (field === 'status') {
    if (value !== 'active' && value !== 'paused')
      return NextResponse.json({ error: 'Status deve ser active ou paused' }, { status: 400 })
  }
  if (field === 'description') {
    if (typeof value !== 'string')
      return NextResponse.json({ error: 'Descrição inválida' }, { status: 400 })
  }
  if (field === 'listing_type_id') {
    if (!ALLOWED_LISTING_TYPES.includes(value as string))
      return NextResponse.json({ error: 'Tipo de anúncio inválido. Use: gold_pro, gold_special ou free' }, { status: 400 })
  }
  if (field === 'condition') {
    if (!ALLOWED_CONDITIONS.includes(value as string))
      return NextResponse.json({ error: 'Condição inválida. Use: new, used ou not_specified' }, { status: 400 })
  }
  if (field === 'attributes') {
    if (!Array.isArray(value))
      return NextResponse.json({ error: 'Atributos devem ser um array' }, { status: 400 })
  }
  if (field === 'pictures') {
    if (!Array.isArray(value))
      return NextResponse.json({ error: 'pictures deve ser um array de URLs' }, { status: 400 })
  }

  await enforceRateLimit(user.id)

  try {
    let updatedItem: Record<string, unknown>

    if (field === 'description') {
      await mlFetch(user.id, `/items/${item_id}/description?api_version=2`, {
        method: 'PUT',
        body: JSON.stringify({ plain_text: String(value) }),
      })
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`)

    } else if (field === 'listing_type_id') {
      // Check if current type is free (cannot upgrade from free)
      const current = await mlFetch<{ listing_type_id: string }>(user.id, `/items/${item_id}`)
      if (current.listing_type_id === 'free') {
        return NextResponse.json(
          { error: 'Não é possível alterar o tipo de um anúncio Gratuito' },
          { status: 400 },
        )
      }
      // POST to /listing_type endpoint (free conversion)
      await mlFetch(user.id, `/items/${item_id}/listing_type`, {
        method: 'POST',
        body: JSON.stringify({ id: String(value) }),
      })
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`)

    } else if (field === 'flex_shipping') {
      const current = await mlFetch<{
        shipping: { tags?: string[]; free_shipping?: boolean; mode?: string; logistic_type?: string; local_pick_up?: boolean }
      }>(user.id, `/items/${item_id}`)
      const tags    = current.shipping?.tags ?? []
      const enable  = Boolean(value)
      const newTags = enable
        ? [...Array.from(new Set([...tags, 'self_service_in']))]
        : tags.filter(t => t !== 'self_service_in')

      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          shipping: {
            ...current.shipping,
            tags:          newTags,
            logistic_type: enable ? 'xd_drop_off' : current.shipping?.logistic_type,
          },
        }),
      })

    } else if (field === 'free_shipping') {
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({ shipping: { free_shipping: Boolean(value) } }),
      })

    } else if (field === 'local_pick_up') {
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({ shipping: { local_pick_up: Boolean(value) } }),
      })

    } else if (field === 'attributes') {
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({ attributes: value }),
      })

    } else if (field === 'warranty') {
      // Update WARRANTY_TYPE in sale_terms
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          sale_terms: [{ id: 'WARRANTY_TYPE', value_name: value ? String(value) : null }],
        }),
      })

    } else if (field === 'pictures') {
      // Replace entire pictures array
      const urls = value as string[]
      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify({
          pictures: urls.map((url: string) => ({ source: url })),
        }),
      })

    } else {
      // Generic fields: title, price, stock, status, condition, seller_custom_field
      const payload: Record<string, unknown> = {}
      if (field === 'stock')               payload['available_quantity'] = Number(value)
      else if (field === 'seller_custom_field') payload['seller_custom_field'] = String(value)
      else payload[field]                  = value

      updatedItem = await mlFetch<Record<string, unknown>>(user.id, `/items/${item_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    }

    // Log to activity_logs
    const fieldLabels: Partial<Record<PatchField, string>> = {
      title:               'título',
      price:               'preço',
      stock:               'estoque',
      status:              'status',
      description:         'descrição',
      listing_type_id:     'tipo de anúncio',
      condition:           'condição',
      seller_custom_field: 'SKU',
      free_shipping:       'frete grátis',
      flex_shipping:       'Envio Flex',
      local_pick_up:       'retirada pessoal',
      attributes:          'atributos',
      warranty:            'garantia',
      pictures:            'imagens',
    }
    await supabaseAdmin()
      .from('activity_logs')
      .insert({
        user_id:     user.id,
        action:      'ml.item.updated',
        category:    'products',
        description: `Anúncio ${item_id} atualizado: ${fieldLabels[field] ?? field} alterado`,
        metadata:    { item_id, field, value },
        visibility:  'user',
      })

    return NextResponse.json({ ok: true, item: updatedItem })
  } catch (err: unknown) {
    const raw         = err instanceof Error ? err.message : String(err)
    const statusMatch = raw.match(/ML API (\d+)/)
    const statusCode  = statusMatch ? parseInt(statusMatch[1], 10) : 500
    const friendly    = mlErrorMessage(raw, statusCode)
    console.error('[items PATCH]', raw)
    return NextResponse.json({ error: friendly }, { status: Math.min(statusCode, 500) })
  }
}
