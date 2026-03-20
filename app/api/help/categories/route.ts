import { NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/server-auth'

export const revalidate = 300 // 5 min cache

export async function GET() {
  const supabase = serverSupabase()

  const { data: categories, error } = await supabase
    .from('help_categories')
    .select('*, help_articles(count)')
    .eq('is_visible', true)
    .order('order_index')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = (categories ?? []).map(cat => ({
    ...cat,
    article_count: (cat.help_articles as unknown as [{ count: number }])?.[0]?.count ?? 0,
  }))

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
