/**
 * GET /api/mercadolivre/categories/root
 * Returns top-level ML categories for MLB site (public API, no auth needed).
 */
import { NextResponse } from 'next/server'

export interface RootCategory {
  id:   string
  name: string
}

interface MLRootCategory {
  id?:   string
  name?: string
}

export async function GET() {
  try {
    const res = await fetch(
      'https://api.mercadolibre.com/sites/MLB/categories',
      { next: { revalidate: 3600 } },
    )

    if (!res.ok) return NextResponse.json([])

    const raw: unknown = await res.json()
    if (!Array.isArray(raw)) return NextResponse.json([])

    const categories: RootCategory[] = (raw as MLRootCategory[])
      .filter(c => c && c.id && c.name)
      .map(c => ({ id: String(c.id), name: String(c.name) }))

    return NextResponse.json(categories)
  } catch {
    return NextResponse.json([])
  }
}
