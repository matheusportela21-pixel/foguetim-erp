/**
 * PATCH  /api/admin/help/categories/[id] — update a help category
 * DELETE /api/admin/help/categories/[id] — delete a help category
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const { id } = await params
  const body = await req.json() as Record<string, unknown>
  const db = supabaseAdmin()

  delete body.id
  delete body.created_at

  const { data, error } = await db
    .from('help_categories')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[admin/help/categories PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ category: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const { id } = await params
  const db = supabaseAdmin()

  const { error } = await db
    .from('help_categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[admin/help/categories DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
