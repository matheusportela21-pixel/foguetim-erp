/**
 * POST /api/blog/posts/[slug]/feedback
 * Records user feedback on a blog post.
 * If helpful = true, increments likes_count.
 * Always returns 200 { ok: true }.
 *
 * Body: { helpful: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface FeedbackBody {
  helpful: boolean
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = (await req.json().catch(() => ({}))) as Partial<FeedbackBody>
    const helpful = body.helpful === true

    if (helpful) {
      const db = supabaseAdmin()

      // Fetch current likes_count first
      const { data } = await db
        .from('blog_posts')
        .select('likes_count')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (data) {
        const currentLikes = (data as { likes_count: number }).likes_count ?? 0
        // Fire-and-forget increment
        db.from('blog_posts')
          .update({ likes_count: currentLikes + 1 })
          .eq('slug', slug)
          .then(() => {})
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[blog/posts/[slug]/feedback] Unexpected error:', err)
    // Always return 200 as per spec
    return NextResponse.json({ ok: true })
  }
}
