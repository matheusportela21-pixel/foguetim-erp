import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const body = await request.json().catch(() => null)
  if (!body || !['yes', 'no'].includes(body.type)) {
    return NextResponse.json({ error: 'Invalid type. Must be "yes" or "no".' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  // Get article id
  const { data: article, error: fetchErr } = await admin
    .from('help_articles')
    .select('id, helpful_yes, helpful_no')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (fetchErr || !article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  const field = body.type === 'yes' ? 'helpful_yes' : 'helpful_no'
  const currentVal = (article as Record<string, number>)[field] ?? 0

  const { error: updateErr } = await admin
    .from('help_articles')
    .update({ [field]: currentVal + 1 })
    .eq('id', article.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
