/**
 * GET /api/blog/categories
 * Returns all visible blog categories ordered by order_index.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  order_index: number
  is_visible: boolean
  post_count: number
}

export async function GET() {
  try {
    const db = supabaseAdmin()

    const { data, error } = await db
      .from('blog_categories')
      .select('id, name, slug, description, icon, color, order_index, is_visible, post_count')
      .eq('is_visible', true)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[blog/categories] Supabase error:', error.message)
      return NextResponse.json({ categories: [] })
    }

    return NextResponse.json({ categories: (data ?? []) as BlogCategory[] })
  } catch (err) {
    console.error('[blog/categories] Unexpected error:', err)
    return NextResponse.json({ categories: [] })
  }
}
