/**
 * GET  /api/admin/blog/categories — list all categories (including hidden)
 * POST /api/admin/blog/categories — create a new category
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('blog_categories')
      .select('id, name, slug, description, icon, color, order_index, is_visible, post_count, created_at, updated_at')
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[admin/blog/categories GET]', error.message)
      return NextResponse.json({ categories: [] }, { status: 500 })
    }

    return NextResponse.json({ categories: data ?? [] })
  } catch (err) {
    console.error('[admin/blog/categories GET] unexpected:', err)
    return NextResponse.json({ categories: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const body = await req.json() as Record<string, unknown>
    const db   = supabaseAdmin()

    delete body.id
    body.created_at = new Date().toISOString()
    body.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from('blog_categories')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('[admin/blog/categories POST]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ category: data }, { status: 201 })
  } catch (err) {
    console.error('[admin/blog/categories POST] unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
