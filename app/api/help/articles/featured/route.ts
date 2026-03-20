import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/server-auth'

export const revalidate = 300

export async function GET() {
  const supabase = serverSupabase()

  const { data: articles, error } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary, tags, views_count, updated_at, help_categories(name, slug, color, icon)')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('views_count', { ascending: false })
    .limit(6)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(articles ?? [], {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
