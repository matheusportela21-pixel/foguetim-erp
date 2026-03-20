import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('help_articles')
    .select('id, title, slug, summary, tags, views_count, updated_at, help_categories(name, slug, color, icon)')
    .eq('is_published', true)
    .or(`title.ilike.%${q}%,summary.ilike.%${q}%`)
    .order('views_count', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
