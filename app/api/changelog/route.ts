/**
 * GET /api/changelog
 * Retorna changelog publicado ordenado por published_at DESC.
 * Query params:
 *   limit    — default 10, max 50
 *   offset   — default 0
 *   category — filtro opcional (feature | fix | improvement | security)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export interface ChangelogEntry {
  id:           string
  version:      string
  title:        string
  description:  string
  details:      string | null
  category:     'feature' | 'fix' | 'improvement' | 'security'
  published_at: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const limit    = Math.min(parseInt(searchParams.get('limit')  ?? '10', 10), 50)
  const offset   = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)
  const category = searchParams.get('category')

  let query = supabaseAdmin()
    .from('changelog')
    .select('id, version, title, description, details, category, published_at', { count: 'exact' })
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ entries: data ?? [], total: count ?? 0, limit, offset })
}
