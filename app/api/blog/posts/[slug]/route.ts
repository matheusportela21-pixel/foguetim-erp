/**
 * GET /api/blog/posts/[slug]
 * Returns a single published blog post by slug.
 * Increments views_count as a fire-and-forget side effect.
 * Returns 404 if the post is not found or not published.
 */
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('blog_posts')
      .select(
        'id, title, slug, summary, content, meta_title, meta_description, tags, category, category_slug, ' +
        'seo_keywords, reading_time_min, status, is_featured, views_count, likes_count, author, ' +
        'published_at, related_product, cover_image_url, cover_image_alt, og_image_url, created_at, updated_at'
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('[blog/posts/[slug]] Supabase error:', error.message)
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const post = data as unknown as BlogPost

    // Fire-and-forget view count increment
    db.from('blog_posts')
      .update({ views_count: (post.views_count ?? 0) + 1 })
      .eq('slug', slug)
      .then(() => {})

    return NextResponse.json({ post })
  } catch (err) {
    console.error('[blog/posts/[slug]] Unexpected error:', err)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
