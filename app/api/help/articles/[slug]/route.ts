import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = serverSupabase()

  const { data: article, error } = await supabase
    .from('help_articles')
    .select('*, help_categories(id, name, slug, color, icon)')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (error || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  // Increment views_count (fire and forget, admin bypasses RLS)
  supabaseAdmin()
    .from('help_articles')
    .update({ views_count: (article.views_count ?? 0) + 1 })
    .eq('id', article.id)
    .then(() => {})

  return NextResponse.json(article)
}
