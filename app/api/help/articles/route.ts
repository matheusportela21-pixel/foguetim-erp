import { NextRequest, NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/server-auth'

export const revalidate = 300

/**
 * GET /api/help/articles
 * Returns published help articles, optionally filtered.
 * Query params:
 *   - featured=true   → only featured articles
 *   - popular=true    → order by views_count desc
 *   - limit=N         → max results (default 10, max 50)
 *   - category=slug   → filter by category slug
 *   - q=search        → search title/content
 */
export async function GET(req: NextRequest) {
  const supabase = serverSupabase()
  const url = req.nextUrl

  const featured = url.searchParams.get('featured') === 'true'
  const popular = url.searchParams.get('popular') === 'true'
  const category = url.searchParams.get('category')
  const search = url.searchParams.get('q')
  const limitParam = parseInt(url.searchParams.get('limit') ?? '10', 10)
  const limit = Math.min(Math.max(limitParam, 1), 50)

  let query = supabase
    .from('help_articles')
    .select('id, title, slug, summary, tags, views_count, helpful_count, updated_at, help_categories(name, slug, color, icon)')
    .eq('is_published', true)

  if (featured) {
    query = query.eq('is_featured', true)
  }

  if (category) {
    // Join filter — category slug
    const { data: cat } = await supabase
      .from('help_categories')
      .select('id')
      .eq('slug', category)
      .single()

    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
  }

  if (popular) {
    query = query.order('views_count', { ascending: false })
  } else {
    query = query.order('updated_at', { ascending: false })
  }

  query = query.limit(limit)

  const { data: articles, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(articles ?? [], {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
