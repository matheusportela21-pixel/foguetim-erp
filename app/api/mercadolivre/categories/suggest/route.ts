/**
 * GET /api/mercadolivre/categories/suggest?q={termo}
 * Uses ML domain_discovery to suggest categories with breadcrumb.
 * Requires user auth (ML token needed).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { mlFetch }                   from '@/lib/mercadolivre'

export interface CategorySuggestion {
  category_id:   string
  category_name: string
  domain_name:   string
  breadcrumb:    string   // e.g. "Electrônicos > Celulares e Telefones"
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

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  try {
    const raw = await mlFetch<MLDomainResult[]>(
      user.id,
      `/sites/MLB/domain_discovery/search?q=${encodeURIComponent(q)}&limit=10`,
    )

    const list: MLDomainResult[] = Array.isArray(raw) ? raw : []

    // Deduplicate by category_id
    const seen = new Set<string>()
    const unique: MLDomainResult[] = []
    for (const r of list) {
      if (r.category_id && !seen.has(r.category_id)) {
        seen.add(r.category_id)
        unique.push(r)
      }
    }

    // Enrich with breadcrumbs via public categories API (parallel)
    const enriched = await Promise.all(
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

    return NextResponse.json(enriched)
  } catch {
    return NextResponse.json([])
  }
}
