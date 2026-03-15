/**
 * GET /api/mercadolivre/categories/suggest?q={termo}
 * Uses ML domain_discovery to suggest categories with breadcrumb.
 * Falls back to listing_evaluations, then to hardcoded popular categories.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'

export interface CategorySuggestion {
  category_id:   string
  category_name: string
  domain_name:   string
  breadcrumb:    string
}

interface MLDomainResult {
  category_id:   string
  category_name: string
  domain_id?:    string
  domain_name?:  string
  attributes?:   unknown[]
}

interface MLCategoryDetail {
  name?:           string
  path_from_root?: { id: string; name: string }[]
}

interface MLListingEval {
  category_id?:   string
  category_name?: string
  domain_id?:     string
  domain_name?:   string
}

const POPULAR_CATEGORIES_FALLBACK: CategorySuggestion[] = [
  { category_id: 'MLB1246',  category_name: 'Beleza e Cuidado Pessoal',   domain_name: '', breadcrumb: 'Beleza e Cuidado Pessoal'   },
  { category_id: 'MLB1430',  category_name: 'Calçados, Roupas e Bolsas',  domain_name: '', breadcrumb: 'Calçados, Roupas e Bolsas'  },
  { category_id: 'MLB1000',  category_name: 'Eletrônicos, Áudio e Vídeo', domain_name: '', breadcrumb: 'Eletrônicos, Áudio e Vídeo' },
  { category_id: 'MLB1574',  category_name: 'Casa, Móveis e Decoração',   domain_name: '', breadcrumb: 'Casa, Móveis e Decoração'   },
  { category_id: 'MLB1276',  category_name: 'Esportes e Fitness',          domain_name: '', breadcrumb: 'Esportes e Fitness'          },
  { category_id: 'MLB1132',  category_name: 'Brinquedos e Hobbies',        domain_name: '', breadcrumb: 'Brinquedos e Hobbies'        },
  { category_id: 'MLB1743',  category_name: 'Carros, Motos e Outros',      domain_name: '', breadcrumb: 'Carros, Motos e Outros'      },
  { category_id: 'MLB1051',  category_name: 'Celulares e Telefones',       domain_name: '', breadcrumb: 'Celulares e Telefones'       },
]

async function enrichWithBreadcrumb(raw: MLDomainResult[]): Promise<CategorySuggestion[]> {
  const seen    = new Set<string>()
  const unique: MLDomainResult[] = []
  for (const r of raw) {
    if (r.category_id && !seen.has(r.category_id)) {
      seen.add(r.category_id)
      unique.push(r)
    }
  }

  return Promise.all(
    unique.slice(0, 8).map(async r => {
      let breadcrumb = r.category_name ?? ''
      try {
        const cat = await fetch(
          `https://api.mercadolibre.com/categories/${r.category_id}`,
          { next: { revalidate: 3600 } },
        )
        if (cat.ok) {
          const detail = await cat.json() as MLCategoryDetail
          if (detail.path_from_root && detail.path_from_root.length > 1) {
            breadcrumb = detail.path_from_root.map(p => p.name).join(' > ')
          }
        }
      } catch {
        // keep default
      }
      const result: CategorySuggestion = {
        category_id:   r.category_id,
        category_name: r.category_name ?? r.category_id,
        domain_name:   r.domain_name ?? '',
        breadcrumb,
      }
      return result
    }),
  )
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  // ── Fallback 1: domain_discovery ────────────────────────────────────────
  try {
    const raw = await mlFetch<MLDomainResult[]>(
      user.id,
      `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(q)}&limit=10`,
    )
    const list: MLDomainResult[] = Array.isArray(raw) ? raw : []
    if (list.length > 0) {
      const enriched = await enrichWithBreadcrumb(list)
      if (enriched.length > 0) return NextResponse.json(enriched)
    }
  } catch {
    // fall through
  }

  // ── Fallback 2: listing_evaluations (category predictor) ────────────────
  try {
    const raw = await mlFetch<unknown>(
      user.id,
      `/sites/MLB/listing_evaluations?title=${encodeURIComponent(q)}&limit=8`,
    )
    // Response shape varies — handle both array and object with nested array
    let evalList: MLListingEval[] = []
    if (Array.isArray(raw)) {
      evalList = raw as MLListingEval[]
    } else if (raw && typeof raw === 'object') {
      const r = raw as Record<string, unknown>
      const nested = r.categories ?? r.results ?? r.suggestions
      if (Array.isArray(nested)) evalList = nested as MLListingEval[]
    }

    const domainResults: MLDomainResult[] = evalList
      .filter(e => e && e.category_id)
      .map(e => ({
        category_id:   String(e.category_id),
        category_name: String(e.category_name ?? e.category_id),
        domain_name:   e.domain_name,
      }))

    if (domainResults.length > 0) {
      const enriched = await enrichWithBreadcrumb(domainResults)
      if (enriched.length > 0) return NextResponse.json(enriched)
    }
  } catch {
    // fall through
  }

  // ── Fallback 3: hardcoded popular categories ─────────────────────────────
  return NextResponse.json(POPULAR_CATEGORIES_FALLBACK)
}
