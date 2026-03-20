/**
 * GET /api/blog/posts/featured
 * Returns the most recent featured published blog post.
 * Response: { post: BlogPost | null }
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
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[blog/posts/featured] Supabase error:', error.message)
      return NextResponse.json({ post: null })
    }

    return NextResponse.json({ post: (data ?? null) as BlogPost | null })
  } catch (err) {
    console.error('[blog/posts/featured] Unexpected error:', err)
    return NextResponse.json({ post: null })
  }
}
