/**
 * GET /api/blog/posts/related
 * Returns published posts from the same category, excluding a specific slug.
 *
 * Query params:
 *   category  — (required) category slug to match
 *   exclude   — slug of the post to exclude from results
 *   limit     — number of posts to return (default 3)
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
    const exclude  = searchParams.get('exclude')
    const rawLimit = parseInt(searchParams.get('limit') ?? '3', 10)
    const limit    = isNaN(rawLimit) ? 3 : Math.max(1, rawLimit)

    if (!category) {
      return NextResponse.json({ posts: [] })
    }

    const db = supabaseAdmin()

    let query = db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, meta_title, meta_description, tags, category, category_slug, ' +
        'seo_keywords, reading_time_min, status, is_featured, views_count, likes_count, author, ' +
        'published_at, related_product, cover_image_url, cover_image_alt, og_image_url, created_at, updated_at'
      )
      .eq('status', 'published')
      .eq('category_slug', category)

    if (exclude) {
      query = query.neq('slug', exclude)
    }

    const { data, error } = await query
      .order('published_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[blog/posts/related] Supabase error:', error.message)
      return NextResponse.json({ posts: [] })
    }

    return NextResponse.json({ posts: (data ?? []) as unknown as BlogPost[] })
  } catch (err) {
    console.error('[blog/posts/related] Unexpected error:', err)
    return NextResponse.json({ posts: [] })
  }
}
