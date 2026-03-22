/**
 * GET  /api/admin/help/categories — list all help categories
 * POST /api/admin/help/categories — create a new category
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('help_categories')
    .select('id, name, slug, color, description, order_index, created_at')
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[admin/help/categories GET]', error.message)
    return NextResponse.json({ categories: [] })
  }

  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  const body = await req.json() as Record<string, unknown>
  const db = supabaseAdmin()

  delete body.id
  body.created_at = new Date().toISOString()

  const { data, error } = await db
    .from('help_categories')
    .insert(body)
    .select()
    .single()

  if (error) {
    console.error('[admin/help/categories POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ category: data }, { status: 201 })
}
