/**
 * GET /api/blog/posts
 * Returns published blog posts with optional filters.
 *
 * Query params:
 *   category  — filter by category slug
 *   tag       — filter by tag (exact match in tags array)
 *   featured  — "true" | "false" — filter by is_featured
 *   limit     — number of posts to return (default 12, max 50)
 *   offset    — pagination offset (default 0)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface BlogPost {
  id: string
  title: string
  slug: string
  summary: string | null
  content?: string
  meta_title: string | null
  meta_description: string | null
  tags: string[] | null
  category: string
  category_slug: string | null
  seo_keywords: string[] | null
  reading_time_min: number | null
  status: string
  is_featured: boolean
  views_count: number
  likes_count: number
  author: string
  published_at: string
  related_product: string | null
  cover_image_url: string | null
  cover_image_alt: string | null
  og_image_url: string | null
  created_at: string
  updated_at: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const category = searchParams.get('category')
    const tag      = searchParams.get('tag')
    const featured = searchParams.get('featured')
    const rawLimit  = parseInt(searchParams.get('limit')  ?? '12', 10)
    const rawOffset = parseInt(searchParams.get('offset') ?? '0',  10)

    const limit  = Math.min(isNaN(rawLimit)  ? 12 : rawLimit,  50)
    const offset = isNaN(rawOffset) ? 0 : rawOffset

    const db = supabaseAdmin()

    let query = db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, meta_title, meta_description, tags, category, category_slug, ' +
        'seo_keywords, reading_time_min, status, is_featured, views_count, likes_count, author, ' +
        'published_at, related_product, cover_image_url, cover_image_alt, og_image_url, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('status', 'published')

    if (category) {
      query = query.eq('category_slug', category)
    }

    if (tag) {
      query = query.contains('tags', [tag.toLowerCase()])
    }

    if (featured === 'true') {
      query = query.eq('is_featured', true)
    } else if (featured === 'false') {
      query = query.eq('is_featured', false)
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[blog/posts] Supabase error:', error.message)
      return NextResponse.json({ posts: [], total: 0, hasMore: false })
    }

    const total   = count ?? 0
    const posts   = (data ?? []) as unknown as BlogPost[]
    const hasMore = offset + posts.length < total

    return NextResponse.json({ posts, total, hasMore })
  } catch (err) {
    console.error('[blog/posts] Unexpected error:', err)
    return NextResponse.json({ posts: [], total: 0, hasMore: false })
  }
}
