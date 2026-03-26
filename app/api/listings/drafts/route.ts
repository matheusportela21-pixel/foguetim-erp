/**
 * GET  /api/listings/drafts?status=all|draft|ready|published|failed
 * POST /api/listings/drafts — cria novo rascunho de listagem.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const sp = new URL(req.url).searchParams
  const status = sp.get('status') ?? 'all'

  let query = supabaseAdmin()
    .from('draft_listings')
    .select('*')
    .eq('user_id', dataOwnerId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    // Table might not exist yet — return empty
    return NextResponse.json({ drafts: [], total: 0 })
  }

  return NextResponse.json({ drafts: data ?? [], total: data?.length ?? 0 })
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('products:edit')
  if (authError) return authError

  const body = await req.json()

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  }

  const draft = {
    user_id: dataOwnerId,
    source_url: body.source_url || null,
    source_marketplace: body.source_marketplace || null,
    source_id: body.source_id || null,
    title: body.title.trim(),
    description: body.description || null,
    price: body.price || null,
    original_price: body.original_price || null,
    currency: body.currency || 'BRL',
    images: body.images || [],
    category: body.category || null,
    brand: body.brand || null,
    condition: body.condition || 'new',
    attributes: body.attributes || {},
    sku: body.sku || null,
    ean: body.ean || null,
    weight: body.weight || null,
    dimensions: body.dimensions || null,
    target_channels: body.target_channels || [],
    status: 'draft',
    created_by: body.created_by || 'copy',
  }

  const { data, error } = await supabaseAdmin()
    .from('draft_listings')
    .insert(draft)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'Erro ao salvar rascunho: ' + error.message },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, draft: data })
}
