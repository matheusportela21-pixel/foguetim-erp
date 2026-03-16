/**
 * POST /api/ai/suggest-category
 * Body: { title: string }
 *
 * Stage 1 — domain_discovery: obtém candidatas reais da API ML (autenticada)
 * Stage 2 — GPT decision: escolhe a melhor categoria final entre as candidatas
 * Stage 3 — fallback: se domain_discovery vazio, navega a árvore com GPT
 */
import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI }               from '@/lib/openai'
import { checkAIRateLimit }         from '@/lib/ai-rate-limit'
import { getAuthUser }              from '@/lib/server-auth'
import { getValidToken }            from '@/lib/mercadolivre'

const ML_API = 'https://api.mercadolibre.com'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface DomainDiscoveryResult {
  category_id:   string
  category_name: string
  domain_id:     string
  domain_name:   string
  attributes?:   { id: string; name: string; tags?: Record<string, boolean> | string[] }[]
}

interface MLCategoryDetail {
  id:                  string
  name:                string
  children_categories: { id: string; name: string }[]
  path_from_root?:     { id: string; name: string }[]
}

interface CandidateCategory {
  category_id:         string
  category_name:       string
  domain_id:           string
  domain_name:         string
  has_children:        boolean
  path_from_root:      { id: string; name: string }[]
  required_attributes: string[]
}

interface GPTDecision {
  selected_category_id:   string
  selected_category_name: string
  selected_domain_id:     string
  is_leaf:                boolean
  decision_summary:       string
  rejected_categories:    { category_id: string; reason: string }[]
}

export interface AICategorySuggestion {
  category_id:   string
  category_name: string
  domain_id:     string
  breadcrumb:    string
  reason:        string
  confidence:    number
  is_leaf:       boolean
  source:        'ai_decision' | 'fallback'
}

/* ─── ML fetch helpers ───────────────────────────────────────────────────── */

async function fetchMLCategory(
  categoryId: string,
  token: string | null,
): Promise<MLCategoryDetail | null> {
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${ML_API}/categories/${categoryId}`, {
      headers,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return await res.json() as MLCategoryDetail
  } catch {
    return null
  }
}

async function fetchDomainDiscovery(
  title: string,
  token: string,
): Promise<DomainDiscoveryResult[]> {
  try {
    const url = `${ML_API}/sites/MLB/domain_discovery/search?limit=8&q=${encodeURIComponent(title)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return []
    const data: unknown = await res.json()
    return Array.isArray(data) ? (data as DomainDiscoveryResult[]) : []
  } catch {
    return []
  }
}

/* ─── Stage 2: GPT decision engine ──────────────────────────────────────── */

const DECISION_SYSTEM_PROMPT = `Você é um motor auxiliar de decisão para categorização no Mercado Livre Brasil.
NÃO deve inventar categoria.
Sua função é escolher a melhor categoria FINAL entre candidatas já obtidas na API oficial do Mercado Livre.

Definições:
- Categoria raiz: topo da árvore
- Categoria intermediária: possui filhos (has_children: true)
- Categoria final: não possui children_categories (has_children: false)

Critérios de escolha:
1. A categoria precisa ser final (has_children: false).
2. O nome da categoria deve representar o tipo principal do produto.
3. Os atributos obrigatórios devem ser compatíveis com o produto.
4. O domínio deve fazer sentido para o item.
5. Em caso de kit, escolher a categoria do item principal, salvo quando houver categoria específica para kit.

Rejeite candidatas quando:
- forem genéricas demais
- tiverem has_children: true
- exigirem atributos incompatíveis com o produto
- forem de outro tipo de produto

Responda APENAS em JSON válido, sem markdown:
{
  "selected_category_id": "MLB123456",
  "selected_category_name": "Tênis",
  "selected_domain_id": "MLB-SNEAKERS",
  "is_leaf": true,
  "decision_summary": "Tênis masculino se encaixa perfeitamente na categoria Tênis",
  "rejected_categories": [
    { "category_id": "MLB1430", "reason": "Categoria raiz genérica demais" }
  ]
}`

async function gptDecideCategory(
  title: string,
  candidates: CandidateCategory[],
): Promise<GPTDecision | null> {
  try {
    const userMessage = `Título do produto: "${title}"
Candidatas da API do ML:
${JSON.stringify(candidates, null, 2)}
Escolha a melhor categoria final para este produto.`

    const raw = await callOpenAI(DECISION_SYSTEM_PROMPT, userMessage, 400)
    return JSON.parse(raw) as GPTDecision
  } catch {
    return null
  }
}

/* ─── Stage 3: fallback tree navigation with GPT ────────────────────────── */

async function findBestLeafCategory(
  categoryId: string,
  title: string,
  token: string | null,
  depth = 0,
): Promise<{ id: string; name: string; breadcrumb: string }> {
  if (depth > 4) {
    const cat = await fetchMLCategory(categoryId, token)
    const breadcrumb = (cat?.path_from_root ?? []).map((c) => c.name).join(' > ') || (cat?.name ?? categoryId)
    return { id: categoryId, name: cat?.name ?? categoryId, breadcrumb }
  }

  const cat = await fetchMLCategory(categoryId, token)
  if (!cat) return { id: categoryId, name: categoryId, breadcrumb: categoryId }

  const breadcrumb = (cat.path_from_root ?? []).map((c) => c.name).join(' > ') || cat.name

  // Leaf: no children
  if (!cat.children_categories || cat.children_categories.length === 0) {
    return { id: cat.id, name: cat.name, breadcrumb }
  }

  // Ask GPT which child is best
  const childrenList = cat.children_categories
    .slice(0, 15)
    .map((c) => `${c.id}: ${c.name}`)
    .join('\n')

  const childPrompt = `Produto: "${title}"
Subcategorias disponíveis:
${childrenList}
Qual subcategoria é mais adequada? Responda apenas com JSON: { "id": "MLB123" }`

  try {
    const raw = await callOpenAI('', childPrompt, 50)
    const choice = JSON.parse(raw) as { id?: string }
    if (choice.id && cat.children_categories.some((c) => c.id === choice.id)) {
      return findBestLeafCategory(choice.id, title, token, depth + 1)
    }
  } catch {
    // fall through to first child
  }

  // GPT failed — take first child
  return findBestLeafCategory(cat.children_categories[0].id, title, token, depth + 1)
}

const ROOT_CATEGORIES = `MLB1246=Beleza, MLB1430=Calçados/Roupas, MLB1000=Eletrônicos,
MLB1574=Casa, MLB1276=Esportes, MLB1743=Carros/Motos,
MLB1051=Celulares, MLB1403=Alimentos, MLB5726=Eletrodomésticos,
MLB1132=Brinquedos, MLB263532=Ferramentas, MLB1384=Bebês,
MLB1071=Animais, MLB5672=Acessórios Veículos, MLB12404=Indústria`

async function fallbackTreeNavigation(
  title: string,
  token: string | null,
): Promise<AICategorySuggestion | null> {
  try {
    const rootPrompt = `Dado o título "${title}", qual categoria raiz do Mercado Livre Brasil é mais adequada?
${ROOT_CATEGORIES}
Responda apenas com JSON: { "root_id": "MLB1430", "reason": "..." }`

    const rootRaw = await callOpenAI('', rootPrompt, 100)
    const rootDecision = JSON.parse(rootRaw) as { root_id?: string; reason?: string }
    if (!rootDecision.root_id) return null

    const leaf = await findBestLeafCategory(rootDecision.root_id, title, token)
    return {
      category_id:   leaf.id,
      category_name: leaf.name,
      domain_id:     '',
      breadcrumb:    leaf.breadcrumb,
      reason:        rootDecision.reason ?? '',
      confidence:    0.6,
      is_leaf:       true,
      source:        'fallback',
    }
  } catch {
    return null
  }
}

/* ─── POST handler ───────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limit = await checkAIRateLimit(user.id, 'suggest_category')
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Limite diário atingido. Recarrega amanhã.', remaining: 0 },
      { status: 429 },
    )
  }

  const body = await req.json() as { title?: string }
  const title = body.title?.trim() ?? ''
  if (!title || title.length < 5) {
    return NextResponse.json({ suggestions: [] })
  }

  const token = await getValidToken(user.id)

  try {
    /* ── Stage 1: domain_discovery ── */
    let rawCandidates: DomainDiscoveryResult[] = []
    if (token) {
      rawCandidates = await fetchDomainDiscovery(title, token)
    }

    /* ── Build enriched candidates (fetch category detail for each) ── */
    const enrichedResults = await Promise.allSettled(
      rawCandidates.map(async (d): Promise<CandidateCategory> => {
        let catDetail: MLCategoryDetail | null = null
        try {
          catDetail = await fetchMLCategory(d.category_id, token)
        } catch {
          // ignore
        }
        return {
          category_id:         d.category_id,
          category_name:       catDetail?.name ?? d.category_name,
          domain_id:           d.domain_id,
          domain_name:         d.domain_name,
          has_children:        (catDetail?.children_categories?.length ?? 0) > 0,
          path_from_root:      catDetail?.path_from_root ?? [],
          required_attributes: (d.attributes ?? [])
            .filter((a) => {
              if (!a.tags) return false
              if (Array.isArray(a.tags)) return a.tags.includes('required')
              return a.tags['required'] === true
            })
            .map((a) => a.name),
        }
      }),
    )

    const validCandidates: CandidateCategory[] = enrichedResults
      .filter((r): r is PromiseFulfilledResult<CandidateCategory> => r.status === 'fulfilled')
      .map((r) => r.value)

    /* ── Stage 2: GPT decision over candidates ── */
    if (validCandidates.length > 0) {
      const decision = await gptDecideCategory(title, validCandidates)

      if (decision?.selected_category_id) {
        const selected = validCandidates.find(
          (c) => c.category_id === decision.selected_category_id,
        )
        const breadcrumb = selected?.path_from_root.length
          ? selected.path_from_root.map((p) => p.name).join(' > ')
          : decision.selected_category_name

        const suggestion: AICategorySuggestion = {
          category_id:   decision.selected_category_id,
          category_name: decision.selected_category_name,
          domain_id:     decision.selected_domain_id ?? '',
          breadcrumb,
          reason:        decision.decision_summary,
          confidence:    0.9,
          is_leaf:       decision.is_leaf,
          source:        'ai_decision',
        }

        return NextResponse.json({
          suggestions: [suggestion],
          rejected:    decision.rejected_categories ?? [],
          remaining:   limit.remaining - 1,
        })
      }

      // GPT failed — return best leaf candidate as fallback (no extra GPT call)
      const leafFallback = validCandidates.find((c) => !c.has_children) ?? validCandidates[0]
      const fb: AICategorySuggestion = {
        category_id:   leafFallback.category_id,
        category_name: leafFallback.category_name,
        domain_id:     leafFallback.domain_id,
        breadcrumb:    leafFallback.path_from_root.map((p) => p.name).join(' > ') || leafFallback.category_name,
        reason:        `Categoria identificada via Mercado Livre (${leafFallback.domain_name})`,
        confidence:    0.75,
        is_leaf:       !leafFallback.has_children,
        source:        'fallback',
      }
      return NextResponse.json({ suggestions: [fb], remaining: limit.remaining - 1 })
    }

    /* ── Stage 3: no domain_discovery results — navigate tree with GPT ── */
    const treeResult = await fallbackTreeNavigation(title, token)
    if (treeResult) {
      return NextResponse.json({ suggestions: [treeResult], remaining: limit.remaining - 1 })
    }

    return NextResponse.json({ suggestions: [] })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
