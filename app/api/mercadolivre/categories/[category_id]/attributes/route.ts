/**
 * GET /api/mercadolivre/categories/[category_id]/attributes
 * Busca atributos da categoria no ML (API pública, sem auth necessária)
 * Retorna apenas atributos relevantes: obrigatórios, de variação ou com relevância definida
 */
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: { category_id: string } }

interface MLRawAttribute {
  id:                string
  name:              string
  type:              string
  tags:              string[]
  relevance?:        number
  values?:           { id: string; name: string }[]
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
  values?:          { id: string; name: string }[]
  hint?:            string
  value_max_length?: number
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { category_id } = params

  if (!category_id || !category_id.startsWith('MLB')) {
    return NextResponse.json({ error: 'Categoria inválida' }, { status: 400 })
  }

  try {
    // ML category attributes are public — no auth required
    const res = await fetch(
      `https://api.mercadolibre.com/categories/${category_id}/attributes`,
      { next: { revalidate: 3600 } }, // cache 1h
    )

    if (!res.ok) {
      throw new Error(`ML API ${res.status} em /categories/${category_id}/attributes`)
    }

    const raw: MLRawAttribute[] = await res.json()

    // Filter to only relevant attributes
    const relevant = raw.filter(a => {
      const tags = a.tags ?? []
      if (tags.includes('required'))            return true
      if (tags.includes('variation_attribute')) return true
      if (a.relevance != null)                  return true
      return false
    })

    const result: CategoryAttribute[] = relevant.map(a => {
      const tags = a.tags ?? []
      const typeRaw = (a.type ?? 'string').toLowerCase()
      // Normalise ML types to our 4 types
      const type = typeRaw === 'list'    ? 'list'
                 : typeRaw === 'number' ? 'number'
                 : typeRaw === 'boolean'? 'boolean'
                 : 'string'
      return {
        id:               a.id,
        name:             a.name,
        type,
        required:         tags.includes('required'),
        isVariation:      tags.includes('variation_attribute'),
        values:           a.values?.map(v => ({ id: v.id, name: v.name })),
        hint:             a.hint ?? a.hints?.[0],
        value_max_length: a.value_max_length,
      }
    })

    // Sort: required first, then variation, then alphabetical
    result.sort((a, b) => {
      if (a.required && !b.required)     return -1
      if (!a.required && b.required)     return  1
      if (a.isVariation && !b.isVariation) return -1
      if (!a.isVariation && b.isVariation) return  1
      return a.name.localeCompare(b.name, 'pt-BR')
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[category attributes GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
