/**
 * GET /api/mercadolivre/categories/[category_id]/attributes
 * Busca atributos da categoria no ML (API pública, sem auth necessária)
 * Retorna apenas atributos relevantes: obrigatórios, de variação ou com relevância definida
 * Em caso de erro sempre retorna [] para degradação graciosa
 */
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { category_id: string } }

interface MLRawAttribute {
  id:                string
  name:              string
  type?:             string
  value_type?:       string  // ML uses value_type in some API versions
  tags:              string[] | null
  relevance?:        number
  values?:           { id: string; name: string }[] | null
  value_max_length?: number
  hint?:             string
  hints?:            string[]
}

export interface CategoryAttribute {
  id:               string
  name:             string
  type:             string  // string | number | boolean | list
  required:         boolean
  isVariation:      boolean
  tags?:            string[]
  values?:          { id: string; name: string }[]
  hint?:            string
  value_max_length?: number
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { category_id } = params

  if (!category_id || !category_id.startsWith('MLB')) {
    return NextResponse.json([])
  }

  try {
    // ML category attributes are public — no auth required
    const res = await fetch(
      `https://api.mercadolibre.com/categories/${category_id}/attributes`,
      { next: { revalidate: 3600 } }, // cache 1h
    )

    if (!res.ok) {
      console.warn('[category attributes GET] ML returned', res.status, 'for', category_id)
      return NextResponse.json([])
    }

    const raw: unknown = await res.json()

    // Guard: ML must return an array
    if (!Array.isArray(raw)) {
      console.warn('[category attributes GET] Non-array response for', category_id)
      return NextResponse.json([])
    }

    // Only exclude attributes that are managed by dedicated fields in the UI
    const ROUTE_EXCLUDED = new Set([
      'ITEM_CONDITION',   // managed via Condição field
      'LISTING_TYPE_ID',  // managed via Tipo field
      'PACKAGE_LENGTH', 'PACKAGE_WIDTH',
      'PACKAGE_HEIGHT', 'PACKAGE_WEIGHT', // managed in Pacote section
    ])

    const relevant = (raw as MLRawAttribute[]).filter(a => {
      if (!a || typeof a !== 'object') return false
      if (ROUTE_EXCLUDED.has(a.id))    return false
      const tags = Array.isArray(a.tags) ? a.tags : []
      if (tags.includes('hidden'))         return false
      if (tags.includes('read_only_api'))  return false
      return true
    })

    const result: CategoryAttribute[] = relevant.map(a => {
      const tags    = Array.isArray(a.tags) ? a.tags : []
      // ML uses both `value_type` and `type` depending on API version
      const typeRaw = (a.value_type ?? a.type ?? 'string').toLowerCase()
      const type    = typeRaw === 'list'    ? 'list'
                    : typeRaw === 'number'  ? 'number'
                    : typeRaw === 'boolean' ? 'boolean'
                    : 'string'
      return {
        id:               a.id ?? '',
        name:             a.name ?? '',
        type,
        required:         tags.includes('required'),
        isVariation:      tags.includes('variation_attribute'),
        tags:             tags.length > 0 ? tags : undefined,
        values:           Array.isArray(a.values) ? a.values.map(v => ({ id: v.id, name: v.name })) : undefined,
        hint:             a.hint ?? a.hints?.[0],
        value_max_length: a.value_max_length,
      }
    })

    // Sort: required first, then variation, then catalog_required, then alphabetical
    result.sort((a, b) => {
      const aReq  = a.required ? 0 : 1
      const bReq  = b.required ? 0 : 1
      if (aReq !== bReq) return aReq - bReq
      if (a.isVariation && !b.isVariation) return -1
      if (!a.isVariation && b.isVariation) return  1
      return a.name.localeCompare(b.name, 'pt-BR')
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[category attributes GET]', msg)
    // Always return empty array — never 500 — so the page degrades gracefully
    return NextResponse.json([])
  }
}
