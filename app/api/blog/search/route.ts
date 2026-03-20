/**
 * GET /api/blog/search?q=...
 * Full-text search across published blog posts.
 * Searches title and summary via ilike, and tags array via contains.
 *
 * Query params:
 *   q — search query (minimum 2 characters)
 *
 * Response: { results: BlogPost[], query: string }
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
  const q = req.nextUrl.searchParams.get('q') ?? ''

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [], query: q })
  }

  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, category, category_slug, author, published_at, reading_time_min, ' +
        'tags, cover_image_url, cover_image_alt, is_featured, views_count, likes_count, status, ' +
        'meta_title, meta_description, seo_keywords, related_product, og_image_url, created_at, updated_at'
      )
      .eq('status', 'published')
      .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
      .order('published_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[blog/search] Supabase error:', error.message)
      return NextResponse.json({ results: [], query: q })
    }

    return NextResponse.json({ results: (data ?? []) as unknown as BlogPost[], query: q })
  } catch (err) {
    console.error('[blog/search] Unexpected error:', err)
    return NextResponse.json({ results: [], query: q })
  }
}
