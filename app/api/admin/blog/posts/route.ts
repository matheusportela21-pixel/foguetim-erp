/**
 * GET  /api/admin/blog/posts — list all posts (any status) for admin panel
 * POST /api/admin/blog/posts — create a new post
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }  from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const { searchParams } = req.nextUrl
    const status   = searchParams.get('status')   // 'all' or specific status
    const category = searchParams.get('category')
    const rawLimit  = parseInt(searchParams.get('limit')  ?? '100', 10)
    const rawOffset = parseInt(searchParams.get('offset') ?? '0',   10)

    const limit  = Math.min(isNaN(rawLimit) ? 100 : rawLimit, 200)
    const offset = isNaN(rawOffset) ? 0 : rawOffset

    const db = supabaseAdmin()
    let query = db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, meta_title, meta_description, tags, category, category_slug, ' +
        'seo_keywords, reading_time_min, status, is_featured, views_count, likes_count, author, ' +
        'published_at, related_product, cover_image_url, created_at, updated_at, content',
        { count: 'exact' }
      )

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category_slug', category)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[admin/blog/posts GET]', error.message)
      return NextResponse.json({ posts: [], total: 0 }, { status: 500 })
    }

    return NextResponse.json({ posts: data ?? [], total: count ?? 0 })
  } catch (err) {
    console.error('[admin/blog/posts GET] unexpected:', err)
    return NextResponse.json({ posts: [], total: 0 }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status ?? 403 })

  try {
    const body = await req.json() as Record<string, unknown>
    const db   = supabaseAdmin()

    // Remove id if present to let DB generate it
    delete body.id
    body.created_at = new Date().toISOString()
    body.updated_at = new Date().toISOString()

    const { data, error } = await db
      .from('blog_posts')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('[admin/blog/posts POST]', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (err) {
    console.error('[admin/blog/posts POST] unexpected:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
