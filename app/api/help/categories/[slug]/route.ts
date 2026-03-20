import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/server-auth'

export const revalidate = 300

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const supabase = serverSupabase()

  const { data: category, error: catError } = await supabase
    .from('help_categories')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_visible', true)
    .single()

  if (catError || !category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const { data: articles, error: artError } = await supabase
    .from('help_articles')
    .select('id, title, slug, summary, tags, views_count, updated_at, is_featured')
    .eq('category_id', category.id)
    .eq('is_published', true)
    .order('order_index', { ascending: true })
    .order('updated_at', { ascending: false })

  if (artError) {
    return NextResponse.json({ error: artError.message }, { status: 500 })
  }

  return NextResponse.json(
    { ...category, articles: articles ?? [] },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
