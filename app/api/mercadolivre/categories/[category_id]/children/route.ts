/**
 * GET /api/mercadolivre/categories/[category_id]/children
 * Returns child categories for a given ML category (public API, no auth).
 */
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { category_id: string } }

export interface ChildCategory {
  id:   string
  name: string
}

interface MLCategory {
  id?:                  string
  name?:                string
  children_categories?: { id: string; name: string }[]
  path_from_root?:      { id: string; name: string }[]
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { category_id } = params

  if (!category_id) return NextResponse.json({ children: [], path_from_root: [] })

  try {
    const res = await fetch(
      `https://api.mercadolibre.com/categories/${category_id}`,
      { next: { revalidate: 3600 } },
    )

    if (!res.ok) return NextResponse.json({ children: [], path_from_root: [] })

    const cat = await res.json() as MLCategory

    const children: ChildCategory[] = (cat.children_categories ?? [])
      .filter(c => c && c.id && c.name)
      .map(c => ({ id: String(c.id), name: String(c.name) }))

    const path_from_root: ChildCategory[] = (cat.path_from_root ?? [])
      .filter(c => c && c.id && c.name)
      .map(c => ({ id: String(c.id), name: String(c.name) }))

    return NextResponse.json({ children, path_from_root, name: cat.name ?? category_id })
  } catch {
    return NextResponse.json({ children: [], path_from_root: [] })
  }
}
