import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthUser } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = supabaseAdmin()
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')
  const status = searchParams.get('status')

  let query = admin
    .from('help_articles')
    .select('id, title, slug, summary, is_published, is_featured, views_count, helpful_yes, helpful_no, updated_at, created_at, category_id, help_categories(name, slug, color)')
    .order('updated_at', { ascending: false })

  if (categoryId) query = query.eq('category_id', categoryId)
  if (status === 'published') query = query.eq('is_published', true)
  if (status === 'draft') query = query.eq('is_published', false)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { title, slug, category_id, summary, content, tags, is_published, is_featured, order_index } = body

  if (!title || !slug || !category_id || !content) {
    return NextResponse.json({ error: 'title, slug, category_id and content are required' }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('help_articles')
    .insert({
      title,
      slug,
      category_id,
      summary: summary ?? null,
      content,
      tags: tags ?? [],
      is_published: is_published ?? false,
      is_featured: is_featured ?? false,
      order_index: order_index ?? 0,
      views_count: 0,
      helpful_yes: 0,
      helpful_no: 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
