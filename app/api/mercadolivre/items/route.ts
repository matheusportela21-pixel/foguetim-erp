/**
 * POST /api/mercadolivre/items
 * Cria um ou dois anúncios no Mercado Livre (Clássico e/ou Premium).
 * Body JSON:
 *   title          string  — título do anúncio
 *   category_id    string  — ex. "MLB1051"
 *   condition      string  — "new" | "used" | "not_specified"
 *   listing_plans  Array<{ listing_type_id: string; price: number; quantity: number }>
 *   description    string  — texto simples (sem HTML)
 *   seller_custom_field?  string
 *   pictures?      string[]  — URLs públicas das imagens (já enviadas ao ML)
 *   free_shipping? boolean
 *   local_pick_up? boolean
 *   attributes?    Array<{ id: string; value_name: string }>
 *   save_draft?    boolean  — se true, salva rascunho no Supabase mesmo em caso de erro parcial
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { getMLConnection, getValidToken, ML_API_BASE } from '@/lib/mercadolivre'
import { supabaseAdmin }             from '@/lib/supabase-admin'

interface ListingPlan {
  listing_type_id: string
  price:           number
  quantity:        number
}

interface CreateBody {
  title:               string
  category_id:         string
  condition:           string
  listing_plans:       ListingPlan[]
  description?:        string
  seller_custom_field?: string
  pictures?:           string[]
  free_shipping?:      boolean
  local_pick_up?:      boolean
  attributes?:         { id: string; value_name: string }[]
  save_draft?:         boolean
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conn = await getMLConnection(user.id)
  if (!conn?.connected) {
    return NextResponse.json({ error: 'ML não conectado', notConnected: true }, { status: 200 })
  }

  const token = await getValidToken(user.id)
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  let body: CreateBody
  try {
    body = await req.json() as CreateBody
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { title, category_id, condition, listing_plans, description, seller_custom_field,
          pictures, free_shipping, local_pick_up, attributes, save_draft } = body

  // Validate required fields
  if (!title?.trim())        return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
  if (!category_id?.trim())  return NextResponse.json({ error: 'Categoria obrigatória' }, { status: 400 })
  if (!Array.isArray(listing_plans) || listing_plans.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos um plano' }, { status: 400 })
  }

  const results: { plan: string; item_id?: string; permalink?: string; error?: string }[] = []
  let firstItemId: string | undefined

  for (const plan of listing_plans) {
    const mlBody: Record<string, unknown> = {
      title:           title.trim(),
      category_id:     category_id.trim(),
      price:           plan.price,
      currency_id:     'BRL',
      available_quantity: plan.quantity,
      buying_mode:     'buy_it_now',
      condition:       condition || 'new',
      listing_type_id: plan.listing_type_id,
    }

    if (seller_custom_field)       mlBody.seller_custom_field = seller_custom_field
    if (free_shipping !== undefined) mlBody.shipping = { mode: 'me2', free_shipping, local_pick_up: local_pick_up ?? false }
    if (Array.isArray(pictures) && pictures.length > 0) {
      mlBody.pictures = pictures.map(url => ({ source: url }))
    }
    if (Array.isArray(attributes) && attributes.length > 0) {
      mlBody.attributes = attributes
    }
    // If second plan, link to first via user_product_id
    if (firstItemId) {
      mlBody.user_product_id = firstItemId
    }

    try {
      const res = await fetch(`${ML_API_BASE}/items`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(mlBody),
      })

      const data: unknown = await res.json()
      const d = data as Record<string, unknown>

      if (!res.ok) {
        results.push({ plan: plan.listing_type_id, error: String(d.message ?? d.error ?? res.status) })
        continue
      }

      const item_id  = String(d.id ?? '')
      const permalink = String(d.permalink ?? '')
      results.push({ plan: plan.listing_type_id, item_id, permalink })
      if (!firstItemId) firstItemId = item_id

      // Add description if provided
      if (description?.trim() && item_id) {
        try {
          await fetch(`${ML_API_BASE}/items/${item_id}/description`, {
            method:  'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body:    JSON.stringify({ plain_text: description.trim() }),
          })
        } catch {
          // non-fatal — description can be added later
        }
      }
    } catch (err: unknown) {
      results.push({ plan: plan.listing_type_id, error: err instanceof Error ? err.message : String(err) })
    }
  }

  // Log activity
  const hasSuccess = results.some(r => r.item_id)
  try {
    await supabaseAdmin().from('activity_logs').insert({
      user_id:     user.id,
      entity_id:   firstItemId ?? 'draft',
      entity_type: 'ml_item',
      action:      'create',
      details:     { title, results },
    })
  } catch { /* non-fatal */ }

  // Save draft if requested
  if (save_draft) {
    try {
      await supabaseAdmin().from('product_drafts').upsert({
        user_id:  user.id,
        title:    title.trim(),
        data:     body,
        status:   hasSuccess ? 'published' : 'draft',
        ml_items: results.filter(r => r.item_id).map(r => r.item_id),
      }, { onConflict: 'user_id,title' })
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ results, success: hasSuccess })
}
