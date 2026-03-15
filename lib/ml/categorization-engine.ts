import { callOpenAI } from '@/lib/openai'
import type {
  CategoryCandidate,
  AICategorizationDecision,
  NormalizedAttribute,
} from './types'

/* ─── Internal ML API response types ─────────────────────────────────────── */

interface MLCategoryResponse {
  id:                  string
  name:                string
  children_categories: Array<{ id: string; name: string }>
  path_from_root?:     Array<{ id: string; name: string }>
}

interface MLAttributeRaw {
  id?:                   string
  name?:                 string
  value_type?:           string
  value_max_length?:     number
  hint?:                 string
  tags?:                 string[]
  attribute_group_id?:   string
  attribute_group_name?: string
  values?:               Array<{ id: string; name: string }>
}

interface MLTechSpecGroup {
  components?: MLAttributeRaw[]
}

interface MLTechSpecResponse {
  groups?: MLTechSpecGroup[]
}

interface MLDiscoveryItem {
  category_id?:   string
  category_name?: string
  domain_id?:     string
  domain_name?:   string
  score?:         number
  attributes?:    Array<{
    id:    string
    name:  string
    tags?: string[]
  }>
}

/* ─── ETAPA 1: Normalizar título ──────────────────────────────────────────── */

export function normalizeTitleForCategoryDiscovery(title: string): string {
  const marketingWords = [
    'original', 'promoção', 'oferta', 'barato', 'qualidade',
    'premium', 'top', 'melhor', 'super', 'mega', 'ultra',
    'grátis', 'brinde', 'kit combo', 'leve', 'pague',
  ]

  let normalized = title.toLowerCase()
  for (const word of marketingWords) {
    normalized = normalized.replace(new RegExp(word, 'gi'), '')
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

/* ─── ETAPA 2: Buscar candidatas na API ML ────────────────────────────────── */

export async function fetchCategoryCandidates(
  normalizedTitle: string,
  token: string,
): Promise<CategoryCandidate[]> {
  const candidates: CategoryCandidate[] = []

  try {
    const res = await fetch(
      `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=8&q=${encodeURIComponent(normalizedTitle)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    if (res.ok) {
      const data: unknown = await res.json()
      if (Array.isArray(data)) {
        for (const item of data as MLDiscoveryItem[]) {
          if (item?.category_id) {
            candidates.push({
              category_id:               item.category_id,
              category_name:             item.category_name ?? '',
              domain_id:                 item.domain_id ?? '',
              domain_name:               item.domain_name ?? '',
              api_score:                 item.score,
              path_from_root:            [],
              children_categories_count: 0,
              is_leaf:                   false,
            })
          }
        }
      }
    }
  } catch {
    // return empty — graceful degradation
  }

  return candidates
}

/* ─── ETAPA 3: Validar se cada candidata é categoria final ────────────────── */

export async function fetchCategoryTreeDetails(
  candidates: CategoryCandidate[],
  token: string | null,
): Promise<CategoryCandidate[]> {
  const validated = await Promise.allSettled(
    candidates.map(async (candidate): Promise<CategoryCandidate> => {
      try {
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const res = await fetch(
          `https://api.mercadolibre.com/categories/${candidate.category_id}`,
          { headers, next: { revalidate: 3600 } } as RequestInit,
        )

        if (!res.ok) return candidate

        const data: unknown = await res.json()
        const cat = data as MLCategoryResponse
        const childrenCount = Array.isArray(cat?.children_categories)
          ? cat.children_categories.length
          : 0

        return {
          ...candidate,
          category_name:             cat?.name ?? candidate.category_name,
          path_from_root:            Array.isArray(cat?.path_from_root) ? cat.path_from_root : [],
          children_categories_count: childrenCount,
          is_leaf:                   childrenCount === 0,
        } satisfies CategoryCandidate
      } catch {
        return candidate
      }
    }),
  )

  return validated
    .filter((r): r is PromiseFulfilledResult<CategoryCandidate> => r.status === 'fulfilled')
    .map((r) => r.value)
}

/* ─── ETAPA 4: IA decide entre candidatas oficiais ────────────────────────── */

const DECISION_SYSTEM_PROMPT = `Você é um motor auxiliar de decisão para categorização no Mercado Livre Brasil.
REGRA ABSOLUTA: Você NÃO pode inventar category_id.
Você APENAS escolhe entre as candidatas fornecidas.

Critérios de escolha (por prioridade):
1. Preferir categorias is_leaf=true (sem filhos)
2. Nome da categoria deve representar o tipo principal do produto
3. Domain deve fazer sentido para o produto
4. Rejeitar categorias genéricas demais
5. Em kits, escolher categoria do item principal

NUNCA aceitar:
- Categorias com children_categories_count > 0 (não são finais)
- Categorias de domínio automotivo para produtos de beleza/moda/casa
- Categorias genéricas quando há opção mais específica

Responda APENAS em JSON válido sem markdown:
{
  "selected_category_id": "string",
  "selected_category_name": "string",
  "selected_domain_id": "string",
  "is_leaf": true,
  "confidence": 0.95,
  "decision_summary": "string",
  "alternatives": []
}`

export async function scoreCategoryCandidatesWithAI(
  originalTitle: string,
  normalizedTitle: string,
  candidates: CategoryCandidate[],
): Promise<AICategorizationDecision> {
  if (candidates.length === 0) {
    throw new Error('Nenhuma candidata disponível para decisão')
  }

  if (candidates.length === 1) {
    const c = candidates[0]
    return {
      selected_category_id:   c.category_id,
      selected_category_name: c.category_name,
      selected_domain_id:     c.domain_id,
      is_leaf:                c.is_leaf,
      confidence:             0.7,
      decision_summary:       'Única candidata disponível',
      alternatives:           [],
    }
  }

  const userMessage = `Título original: "${originalTitle}"
Título normalizado: "${normalizedTitle}"
Candidatas oficiais da API do Mercado Livre:
${JSON.stringify(
    candidates.map((c) => ({
      category_id:               c.category_id,
      category_name:             c.category_name,
      domain_id:                 c.domain_id,
      domain_name:               c.domain_name,
      path_from_root:            c.path_from_root.map((p) => p.name).join(' > '),
      children_categories_count: c.children_categories_count,
      is_leaf:                   c.is_leaf,
    })),
    null,
    2,
  )}
Escolha a melhor categoria final. Se todas tiverem filhos, escolha a mais específica.`

  try {
    const raw = await callOpenAI(DECISION_SYSTEM_PROMPT, userMessage, 600)
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean) as AICategorizationDecision
  } catch {
    const leaf = candidates.find((c) => c.is_leaf) ?? candidates[0]
    return {
      selected_category_id:   leaf.category_id,
      selected_category_name: leaf.category_name,
      selected_domain_id:     leaf.domain_id,
      is_leaf:                leaf.is_leaf,
      confidence:             0.5,
      decision_summary:       'Fallback automático por erro no parse da IA',
      alternatives:           [],
    }
  }
}

/* ─── ETAPA 5: Resolver categoria final ──────────────────────────────────── */

export async function resolveFinalCategory(
  decision: AICategorizationDecision,
  candidates: CategoryCandidate[],
  token: string | null,
): Promise<CategoryCandidate> {
  const official = candidates.find((c) => c.category_id === decision.selected_category_id)

  if (!official) {
    return candidates.find((c) => c.is_leaf) ?? candidates[0]
  }

  if (!official.is_leaf && official.children_categories_count > 0) {
    try {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(
        `https://api.mercadolibre.com/categories/${official.category_id}`,
        { headers },
      )
      const data: unknown = await res.json()
      const cat = data as MLCategoryResponse
      const children = Array.isArray(cat?.children_categories) ? cat.children_categories : []

      if (children.length > 0) {
        const childCandidates = await fetchCategoryTreeDetails(
          children.slice(0, 8).map((c) => ({
            category_id:               c.id,
            category_name:             c.name,
            domain_id:                 official.domain_id,
            domain_name:               official.domain_name,
            path_from_root:            Array.from([
              ...official.path_from_root,
              { id: official.category_id, name: official.category_name },
            ]),
            children_categories_count: 0,
            is_leaf:                   false,
          })),
          token,
        )

        const leaf = childCandidates.find((c) => c.is_leaf)
        if (leaf) return leaf
      }
    } catch {
      // fallback to official
    }
  }

  return official
}

/* ─── ETAPA 6: Reset de atributos ao trocar categoria ─────────────────────── */

export function purgeAttributesFromOldCategory(
  oldCategoryId: string,
  newCategoryId: string,
  currentValues: Record<string, string>,
): { purged: Record<string, string>; discarded: string[] } {
  if (oldCategoryId === newCategoryId) {
    return { purged: currentValues, discarded: [] }
  }
  return { purged: {}, discarded: Object.keys(currentValues) }
}

/* ─── ETAPA 7+8: Carregar e normalizar atributos da categoria final ─────────  */

const AUTOMOTIVE_DOMAINS = new Set(['MLB-CARS', 'MLB-MOTORCYCLES', 'MLB-TRUCKS', 'MLB-AUTO_PARTS'])
const AUTOMOTIVE_ONLY = new Set([
  'COMPATIBLE_BRAND', 'COMPATIBLE_MODEL', 'COMPATIBLE_YEAR',
  'VEHICLE_YEAR', 'KILOMETERS', 'FUEL_TYPE', 'DOORS',
  'BATTERY_INDEPENDENCE', 'WITH_BATTERY', 'BATTERY_TYPE',
  'COMPATIBLE_VEHICLES', 'POSITION',
])
const ALWAYS_EXCLUDED = new Set([
  'ITEM_CONDITION', 'LISTING_TYPE_ID', 'SELLER_SKU', 'GTIN', 'EAN',
  'PACKAGE_LENGTH', 'PACKAGE_WIDTH', 'PACKAGE_HEIGHT', 'PACKAGE_WEIGHT',
  'NCM', 'CUSTOMS_CLASSIFICATION', 'IMPORT_TAX', 'TAX_CATEGORY_ID',
])

export async function loadCategoryAttributes(
  categoryId: string,
  domainId: string,
  token: string | null,
): Promise<{
  required:    NormalizedAttribute[]
  conditional: NormalizedAttribute[]
  optional:    NormalizedAttribute[]
  variation:   NormalizedAttribute[]
  hidden:      NormalizedAttribute[]
}> {
  const isAutomotive = Array.from(AUTOMOTIVE_DOMAINS).some((d) => domainId?.includes(d))
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const [attrsRes, conditionalRes, techRes] = await Promise.allSettled([
    fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`, { headers }),
    fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes/conditional`, { headers }),
    fetch(`https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`, { headers }),
  ])

  const normalizeRaw = (
    raw: MLAttributeRaw[],
    source: NormalizedAttribute['source_endpoint'],
  ): NormalizedAttribute[] =>
    raw
      .filter((attr) => {
        if (!attr?.id)                                     return false
        if (ALWAYS_EXCLUDED.has(attr.id))                  return false
        if (!isAutomotive && AUTOMOTIVE_ONLY.has(attr.id)) return false
        if (Array.isArray(attr.tags)) {
          if (attr.tags.includes('hidden'))        return false
          if (attr.tags.includes('read_only'))     return false
          if (attr.tags.includes('read_only_api')) return false
        }
        return true
      })
      .map(
        (attr): NormalizedAttribute => ({
          id:                     attr.id!,
          name:                   attr.name ?? '',
          value_type:             attr.value_type ?? 'string',
          value_max_length:       attr.value_max_length,
          hint:                   attr.hint,
          tags:                   Array.isArray(attr.tags) ? attr.tags : [],
          attribute_group_id:     attr.attribute_group_id ?? 'OTHERS',
          attribute_group_name:   attr.attribute_group_name ?? 'Outros',
          allowed_values:         Array.isArray(attr.values)
            ? attr.values.map((v) => ({ id: v.id ?? '', name: v.name ?? '' }))
            : [],
          source_endpoint:        source,
          is_required:            Array.isArray(attr.tags) && attr.tags.includes('required'),
          is_conditional:         source === 'conditional',
          is_hidden:              Array.isArray(attr.tags) && attr.tags.includes('hidden'),
          is_allow_variations:    Array.isArray(attr.tags) && attr.tags.includes('allow_variations'),
          is_variation_attribute: Array.isArray(attr.tags) && attr.tags.includes('variation_attribute'),
          domain_id:              domainId,
          category_id:            categoryId,
        }),
      )

  let mainAttrs: NormalizedAttribute[]     = []
  let conditionalAttrs: NormalizedAttribute[] = []
  let techAttrs: NormalizedAttribute[]     = []

  if (attrsRes.status === 'fulfilled' && attrsRes.value.ok) {
    const raw: unknown = await attrsRes.value.json()
    mainAttrs = normalizeRaw(Array.isArray(raw) ? (raw as MLAttributeRaw[]) : [], 'attributes')
  }

  if (conditionalRes.status === 'fulfilled' && conditionalRes.value.ok) {
    const raw: unknown = await conditionalRes.value.json()
    conditionalAttrs = normalizeRaw(
      Array.isArray(raw) ? (raw as MLAttributeRaw[]) : [],
      'conditional',
    )
  }

  if (techRes.status === 'fulfilled' && techRes.value.ok) {
    const raw: unknown = await techRes.value.json()
    const tech = raw as MLTechSpecResponse
    const techList: MLAttributeRaw[] = (tech?.groups ?? []).flatMap(
      (g) => (Array.isArray(g.components) ? g.components : []) as MLAttributeRaw[],
    )
    techAttrs = normalizeRaw(techList, 'technical_specs')
  }

  // Deduplicate: main > tech > conditional
  const seen = new Set<string>()
  const dedup = (attrs: NormalizedAttribute[]): NormalizedAttribute[] =>
    attrs.filter((a) => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })

  const allAttrs = dedup(Array.from([...mainAttrs, ...techAttrs, ...conditionalAttrs]))

  return {
    required:    allAttrs.filter((a) => a.is_required && !a.is_variation_attribute),
    conditional: allAttrs.filter((a) => a.is_conditional),
    optional:    allAttrs.filter((a) => !a.is_required && !a.is_conditional && !a.is_variation_attribute && !a.is_hidden),
    variation:   allAttrs.filter((a) => a.is_variation_attribute || a.is_allow_variations),
    hidden:      allAttrs.filter((a) => a.is_hidden),
  }
}

/* ─── ETAPA 9: Whitelist rígida ──────────────────────────────────────────── */

export function buildCategoryAttributeWhitelist(attrs: {
  required:    NormalizedAttribute[]
  conditional: NormalizedAttribute[]
  optional:    NormalizedAttribute[]
  variation:   NormalizedAttribute[]
  hidden:      NormalizedAttribute[]
}): Set<string> {
  const all = Array.from([
    ...attrs.required,
    ...attrs.conditional,
    ...attrs.optional,
    ...attrs.variation,
    ...attrs.hidden,
  ])
  return new Set(all.map((a) => a.id))
}

export function isAttributeAllowedForCategory(
  attrId: string,
  whitelist: Set<string>,
): boolean {
  return whitelist.has(attrId)
}

/* ─── Detector de domínio especial ──────────────────────────────────────── */

export function detectSpecialDomainFlow(domainId: string): {
  isSpecial: boolean
  flowType: 'standard' | 'automotive' | 'real_estate' | 'fashion' | 'food'
} {
  if (!domainId) return { isSpecial: false, flowType: 'standard' }

  const d = domainId.toUpperCase()
  if (d.includes('CAR') || d.includes('MOTOR') || d.includes('AUTO') || d.includes('TRUCK'))
    return { isSpecial: true, flowType: 'automotive' }
  if (d.includes('REAL_ESTATE') || d.includes('PROPERTY'))
    return { isSpecial: true, flowType: 'real_estate' }
  if (d.includes('SHOE') || d.includes('CLOTH') || d.includes('APPAREL') || d.includes('FASHION'))
    return { isSpecial: false, flowType: 'fashion' }
  if (d.includes('FOOD') || d.includes('BEVERAGE'))
    return { isSpecial: false, flowType: 'food' }

  return { isSpecial: false, flowType: 'standard' }
}
