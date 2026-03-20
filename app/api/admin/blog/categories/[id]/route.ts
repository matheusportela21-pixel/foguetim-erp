/**
 * PATCH  /api/admin/blog/categories/[id] — update a category
 * DELETE /api/admin/blog/categories/[id] — delete a category
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const body = await req.json() as Record<string, unknown>
    const db   = supabaseAdmin()

    delete body.id
    delete body.created_at
    body.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from('blog_categories')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[admin/blog/categories PATCH]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: data })
  } catch (err) {
    console.error('[admin/blog/categories PATCH] unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const db = supabaseAdmin()

    const { error } = await db
      .from('blog_categories')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('[admin/blog/categories DELETE]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/blog/categories DELETE] unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
