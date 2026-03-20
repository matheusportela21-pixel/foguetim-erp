/**
 * GET /api/blog/posts/popular
 * Returns the top 5 published blog posts ordered by views_count DESC.
 * Response: { posts: BlogPost[] }
 */
import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, meta_title, meta_description, tags, category, category_slug, ' +
        'seo_keywords, reading_time_min, status, is_featured, views_count, likes_count, author, ' +
        'published_at, related_product, cover_image_url, cover_image_alt, og_image_url, created_at, updated_at'
      )
      .eq('status', 'published')
      .order('views_count', { ascending: false })
      .limit(5)

    if (error) {
      console.error('[blog/posts/popular] Supabase error:', error.message)
      return NextResponse.json({ posts: [] })
    }

    return NextResponse.json({ posts: (data ?? []) as unknown as BlogPost[] })
  } catch (err) {
    console.error('[blog/posts/popular] Unexpected error:', err)
    return NextResponse.json({ posts: [] })
  }
}
