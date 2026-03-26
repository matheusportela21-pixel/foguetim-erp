/**
 * GET    /api/listings/drafts/[id] — detalhes do rascunho
 * PATCH  /api/listings/drafts/[id] — atualiza campos do rascunho
 * DELETE /api/listings/drafts/[id] — remove rascunho
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await requirePermission('products:view')
  if (authError) return authError

  const { data, error } = await supabaseAdmin()
    .from('draft_listings')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', dataOwnerId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Rascunho não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ draft: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await requirePermission('products:edit')
  if (authError) return authError

  const body = await req.json()

  // Only allow updating specific fields
  const allowed = [
    'title',
    'description',
    'price',
    'original_price',
    'currency',
    'images',
    'category',
    'brand',
    'condition',
    'attributes',
    'sku',
    'ean',
    'weight',
    'dimensions',
    'target_channels',
    'status',
  ]
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabaseAdmin()
    .from('draft_listings')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', dataOwnerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, draft: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await requirePermission('products:edit')
  if (authError) return authError

  const { error } = await supabaseAdmin()
    .from('draft_listings')
    .delete()
    .eq('id', params.id)
    .eq('user_id', dataOwnerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
