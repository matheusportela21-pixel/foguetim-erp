/**
 * POST /api/ai/suggest-category
 * Body: { title: string }
 * 1. GPT identifica a categoria raiz + subcategoria sugerida
 * 2. Navega a árvore ML (API pública) para encontrar a leaf mais específica
 * 3. Retorna sugestões com breadcrumb completo
 */
import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI }                from '@/lib/openai'
import { checkAIRateLimit }          from '@/lib/ai-rate-limit'
import { getAuthUser }               from '@/lib/server-auth'

export interface AICategorySuggestion {
  category_id:   string
  category_name: string
  breadcrumb:    string
  reason:        string
  confidence:    number
}

interface GPTSuggestion {
  root_category_id:   string
  root_category_name: string
  suggested_subcategory: string
  reason:             string
  confidence:         number
}

interface MLCategory {
  id:                  string
  name:                string
  children_categories: { id: string; name: string }[]
}

const SYSTEM_PROMPT = `Você é especialista em categorização de produtos no Mercado Livre Brasil. Dado um título de produto, retorne as 3 categorias mais adequadas em ordem de relevância.

IMPORTANTE: Retorne a categoria FINAL mais específica possível, não a raiz.
Por exemplo para "Tênis masculino": retorne "Tênis" não "Calçados, Roupas e Bolsas"

Mapeamento de categorias raiz MLB:
MLB1246 - Beleza e Cuidado Pessoal
MLB1430 - Calçados, Roupas e Bolsas
MLB1132 - Brinquedos e Hobbies
MLB1743 - Carros, Motos e Outros
MLB1574 - Casa, Móveis e Decoração
MLB1051 - Celulares e Telefones
MLB1500 - Construção
MLB5726 - Eletrodomésticos
MLB1000 - Eletrônicos, Áudio e Vídeo
MLB1276 - Esportes e Fitness
MLB263532 - Ferramentas
MLB1403 - Alimentos e Bebidas
MLB1384 - Bebês
MLB1039 - Câmeras e Acessórios
MLB1071 - Animais
MLB5672 - Acessórios para Veículos
MLB12404 - Indústria e Comércio
MLB1459 - Imóveis

Responda APENAS com JSON válido, sem markdown:
{"suggestions":[{"root_category_id":"MLB1430","root_category_name":"Calçados, Roupas e Bolsas","suggested_subcategory":"Tênis","reason":"Produto é um tênis masculino","confidence":0.95}]}`

/** Fetch ML category node (public API, no auth) */
async function fetchMLCategory(categoryId: string): Promise<MLCategory | null> {
  try {
    const res = await fetch(
      `https://api.mercadolibre.com/categories/${categoryId}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    return await res.json() as MLCategory
  } catch {
    return null
  }
}

/** Normalize string for fuzzy matching */
function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Score how well a category name matches the target */
function matchScore(catName: string, target: string): number {
  const cn = normalize(catName)
  const tg = normalize(target)
  if (cn === tg) return 100
  if (cn.includes(tg) || tg.includes(cn)) return 80
  // word overlap
  const cnWords = new Set(cn.split(' '))
  const tgWords = tg.split(' ')
  const overlap = tgWords.filter(w => w.length > 2 && cnWords.has(w)).length
  return overlap * 20
}

/**
 * Navigate the ML category tree starting from rootId,
 * following the path most similar to targetSubcategory.
 * Returns { id, breadcrumb } of the best matching leaf (up to 4 levels deep).
 */
async function findBestCategory(
  rootId: string,
  targetSubcategory: string,
  pathNames: string[] = [],
  depth = 0,
): Promise<{ id: string; name: string; breadcrumb: string }> {
  const node = await fetchMLCategory(rootId)
  if (!node) return { id: rootId, name: rootId, breadcrumb: pathNames.join(' > ') || rootId }

  const currentPath = [...pathNames, node.name]

  // No children or max depth reached → this is our leaf
  if (!node.children_categories || node.children_categories.length === 0 || depth >= 4) {
    return { id: node.id, name: node.name, breadcrumb: currentPath.join(' > ') }
  }

  // Find best matching child
  let bestChild = node.children_categories[0]
  let bestScore = -1
  for (const child of node.children_categories) {
    const s = matchScore(child.name, targetSubcategory)
    if (s > bestScore) { bestScore = s; bestChild = child }
  }

  // If no reasonable match found at this level, return current node
  if (bestScore === 0 && depth > 0) {
    return { id: node.id, name: node.name, breadcrumb: currentPath.join(' > ') }
  }

  // Recurse into best child
  return findBestCategory(bestChild.id, targetSubcategory, currentPath, depth + 1)
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limit = await checkAIRateLimit(user.id, 'suggest_category')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Limite diário atingido. Recarrega amanhã.', remaining: 0 }, { status: 429 })
  }

  const body = await req.json() as { title?: string }
  const title = body.title?.trim() ?? ''
  if (!title || title.length < 5) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    // Step 1: GPT identifies root + subcategory
    const raw = await callOpenAI(SYSTEM_PROMPT, `Título do produto: "${title}"`, 400)
    const parsed = JSON.parse(raw) as { suggestions?: GPTSuggestion[] }
    const gptSugs = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : []

    if (gptSugs.length === 0) return NextResponse.json({ suggestions: [] })

    // Step 2: For each GPT suggestion, navigate ML tree to find best leaf
    const suggestions: AICategorySuggestion[] = await Promise.all(
      gptSugs.map(async (s) => {
        const best = await findBestCategory(s.root_category_id, s.suggested_subcategory)
        return {
          category_id:   best.id,
          category_name: best.name,
          breadcrumb:    best.breadcrumb,
          reason:        s.reason,
          confidence:    s.confidence,
        }
      }),
    )

    return NextResponse.json({ suggestions, remaining: limit.remaining - 1 })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
