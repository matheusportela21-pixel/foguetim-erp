import type { NormalizedMlAttribute, MlAttributeEngineLog, MlRejectedAttribute } from './types'

/* ─── IDs que NUNCA aparecem na seção de atributos ───────────────────────── */

export const IDENTIFIER_IDS = new Set([
  'GTIN', 'EAN', 'UPC', 'ISBN', 'MPN',
  'SELLER_SKU', 'ALPHANUMERIC_MODEL',
])

export const LOGISTICS_IDS = new Set([
  'PACKAGE_LENGTH', 'PACKAGE_WIDTH', 'PACKAGE_HEIGHT',
  'PACKAGE_WEIGHT', 'WEIGHT', 'LENGTH', 'WIDTH', 'HEIGHT',
])

export const SALE_IDS = new Set([
  'ITEM_CONDITION', 'LISTING_TYPE_ID',
  'WARRANTY_TYPE', 'WARRANTY_TIME',
])

export const FISCAL_IDS = new Set([
  'NCM', 'CEST', 'CUSTOMS_CLASSIFICATION',
  'IMPORT_TAX', 'TAX_CATEGORY_ID', 'ORIGIN',
])

export const AUTOMOTIVE_EXCLUSIVE = new Set([
  'COMPATIBLE_BRAND', 'COMPATIBLE_MODEL', 'COMPATIBLE_YEAR',
  'VEHICLE_YEAR', 'KILOMETERS', 'FUEL_TYPE', 'DOORS',
  'COMPATIBLE_VEHICLES', 'POSITION', 'ENGINE_POWER',
  'TRANSMISSION', 'TRACTION',
])

/* ─── Internal ML raw response types ────────────────────────────────────── */

interface RawMlAttribute {
  id?:                   string
  name?:                 string
  value_type?:           string
  value_max_length?:     number
  hint?:                 string
  tags?:                 Record<string, boolean> | string[]
  attribute_group_id?:   string
  attribute_group_name?: string
  values?:               Array<{ id?: string; name?: string }>
}

interface RawTechGroup {
  components?: RawMlAttribute[]
}

interface RawTechResponse {
  groups?: RawTechGroup[]
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** ML tags chegam como objeto {required: true}, não array. Suporta ambos. */
export function hasTag(
  tags: Record<string, boolean> | string[] | null | undefined,
  tag: string,
): boolean {
  if (!tags) return false
  if (Array.isArray(tags)) return tags.includes(tag)
  return tags[tag] === true
}

/** Normaliza tags brutas da API para Record<string, boolean> */
function normalizeTags(raw?: Record<string, boolean> | string[]): Record<string, boolean> {
  if (!raw) return {}
  if (Array.isArray(raw)) return Object.fromEntries(raw.map(t => [t, true]))
  return raw
}

function isAutomotiveDomain(domainId: string): boolean {
  const d = (domainId ?? '').toUpperCase()
  return d.includes('AUTO') || d.includes('CAR') ||
    d.includes('MOTOR') || d.includes('TRUCK') || d.includes('VEHICLE')
}

function normalizeValueType(raw: string | undefined): NormalizedMlAttribute['value_type'] {
  switch (raw) {
    case 'number':     return 'number'
    case 'boolean':    return 'boolean'
    case 'list':       return 'list'
    case 'list_multi': return 'list_multi'
    case 'text':       return 'text'
    default:           return 'string'
  }
}

type CurrentValuesMap = Record<string, { value?: string; value_id?: string }>

function parseRawAttribute(
  raw:             RawMlAttribute,
  source:          NormalizedMlAttribute['source'],
  categoryId:      string,
  domainId:        string,
  currentValues:   CurrentValuesMap,
): NormalizedMlAttribute {
  const id      = raw.id!
  const tags    = normalizeTags(raw.tags)
  const cv      = currentValues[id]
  const hasVal  = !!(cv?.value || cv?.value_id)

  return {
    id,
    name:                   raw.name ?? '',
    value_type:             normalizeValueType(raw.value_type),
    value_max_length:       raw.value_max_length,
    tags,
    attribute_group_id:     raw.attribute_group_id  ?? 'OTHERS',
    attribute_group_name:   raw.attribute_group_name ?? 'Outros',
    allowed_values:         Array.isArray(raw.values)
      ? raw.values.map((v) => ({ id: String(v.id ?? ''), name: String(v.name ?? '') }))
      : [],
    source,
    category_id:            categoryId,
    domain_id:              domainId,
    hint:                   raw.hint,
    is_required:            hasTag(tags, 'required'),
    is_conditional:         source === 'conditional',
    is_hidden:              hasTag(tags, 'hidden'),
    is_fixed:               hasTag(tags, 'fixed'),
    is_new_required:        hasTag(tags, 'new_required'),
    is_variation_attribute: hasTag(tags, 'variation_attribute'),
    is_allow_variations:    hasTag(tags, 'allow_variations'),
    is_identifier:          IDENTIFIER_IDS.has(id),
    is_recommended:         hasTag(tags, 'catalog_required') || hasVal,
    current_value:          cv?.value,
    current_value_id:       cv?.value_id,
  } satisfies NormalizedMlAttribute
}

/* ─── Loader de atributos brutos da ML ──────────────────────────────────── */

export async function loadRawAttributesFromML(
  categoryId: string,
  token: string,
): Promise<{ main: RawMlAttribute[]; conditional: RawMlAttribute[]; technical: RawMlAttribute[] }> {
  const headers = { Authorization: `Bearer ${token}` }

  const [mainRes, condRes, techRes] = await Promise.allSettled([
    fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`,            { headers }),
    fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes/conditional`, { headers }),
    fetch(`https://api.mercadolibre.com/categories/${categoryId}/technical_specs/input`,  { headers }),
  ])

  let main:        RawMlAttribute[] = []
  let conditional: RawMlAttribute[] = []
  let technical:   RawMlAttribute[] = []

  if (mainRes.status === 'fulfilled' && mainRes.value.ok) {
    const d: unknown = await mainRes.value.json()
    main = Array.isArray(d) ? (d as RawMlAttribute[]) : []
  }
  if (condRes.status === 'fulfilled' && condRes.value.ok) {
    const d: unknown = await condRes.value.json()
    conditional = Array.isArray(d) ? (d as RawMlAttribute[]) : []
  }
  if (techRes.status === 'fulfilled' && techRes.value.ok) {
    const d: unknown = await techRes.value.json()
    const tech = d as RawTechResponse
    technical = (tech?.groups ?? []).flatMap(
      (g) => (Array.isArray(g.components) ? g.components : []) as RawMlAttribute[],
    )
  }

  return { main, conditional, technical }
}

/* ─── Engine principal ───────────────────────────────────────────────────── */

export interface ItemAttributeInput {
  id:          string
  value_name?: string | null
  value_id?:   string | null
}

export interface BuildEngineResult {
  attributes:  NormalizedMlAttribute[]
  identifiers: RawMlAttribute[]
  rejected:    MlRejectedAttribute[]
  log:         Partial<MlAttributeEngineLog>
}

export async function buildAttributeEngineState(
  categoryId:             string,
  domainId:               string,
  token:                  string,
  currentItemAttributes?: ItemAttributeInput[],
): Promise<BuildEngineResult> {
  const isAuto = isAutomotiveDomain(domainId)

  const currentValues: CurrentValuesMap = {}
  for (const a of currentItemAttributes ?? []) {
    currentValues[a.id] = {
      value:    a.value_name  ?? undefined,
      value_id: a.value_id    ?? undefined,
    }
  }

  const { main, conditional, technical } = await loadRawAttributesFromML(categoryId, token)

  const rejected:   MlRejectedAttribute[] = []
  const identifiers: RawMlAttribute[]     = []
  const attributes:  NormalizedMlAttribute[] = []
  const seen = new Set<string>()

  function process(rawList: RawMlAttribute[], source: NormalizedMlAttribute['source']): void {
    for (const raw of rawList) {
      if (!raw?.id) continue
      if (seen.has(raw.id)) continue
      seen.add(raw.id)

      if (IDENTIFIER_IDS.has(raw.id)) {
        identifiers.push(raw)
        continue
      }
      if (LOGISTICS_IDS.has(raw.id)) {
        rejected.push({ id: raw.id, name: raw.name ?? '', reason: 'Campo de logística — tratado em seção própria' })
        continue
      }
      if (SALE_IDS.has(raw.id)) {
        rejected.push({ id: raw.id, name: raw.name ?? '', reason: 'Campo de venda — tratado em seção própria' })
        continue
      }
      if (FISCAL_IDS.has(raw.id)) {
        rejected.push({ id: raw.id, name: raw.name ?? '', reason: 'Campo fiscal — tratado em seção própria' })
        continue
      }
      if (!isAuto && AUTOMOTIVE_EXCLUSIVE.has(raw.id)) {
        rejected.push({ id: raw.id, name: raw.name ?? '', reason: 'Atributo automotivo em categoria não-automotiva' })
        continue
      }

      if (hasTag(raw.tags, 'hidden') && !currentValues[raw.id]) continue

      attributes.push(parseRawAttribute(raw, source, categoryId, domainId, currentValues))
    }
  }

  // Ordem: main > technical > conditional (dedup via seen)
  process(main,        'attributes')
  process(technical,   'technical_specs')
  process(conditional, 'conditional')

  const log: Partial<MlAttributeEngineLog> = {
    category_id:       categoryId,
    domain_id:         domainId,
    total_loaded:      attributes.length,
    total_required:    attributes.filter((a) => a.is_required).length,
    total_conditional: attributes.filter((a) => a.is_conditional).length,
    total_variation:   attributes.filter((a) => a.is_variation_attribute).length,
    total_rejected:    rejected.length,
    rejected_reasons:  Object.fromEntries(rejected.map((r) => [r.id, r.reason])),
    timestamp:         new Date().toISOString(),
  }

  return { attributes, identifiers, rejected, log }
}
