/**
 * Loads and groups category attributes into 4 tiers for display.
 * Tier 1 — required:            must be filled, always visible
 * Tier 2 — conditional:         visible only when parent value is set
 * Tier 3 — optional_recommended: catalog_required or has a current value
 * Tier 4 — advanced:            everything else (collapsed by default)
 */
import { loadCategoryAttributes } from '@/lib/ml/categorization-engine'
import type { NormalizedAttribute } from '@/lib/ml/types'

export interface AttributeGroups {
  required:             NormalizedAttribute[]
  conditional:          NormalizedAttribute[]
  optional_recommended: NormalizedAttribute[]
  advanced:             NormalizedAttribute[]
  variation:            NormalizedAttribute[]
  hidden:               NormalizedAttribute[]
}

/**
 * Calls the 3-endpoint engine and splits attributes into 4 display tiers.
 * `currentValues` — map of attrId → current value string for determining
 * whether an optional attr should be promoted to "recommended".
 */
export async function loadCategoryAttributeGroups(
  categoryId: string,
  domainId:   string,
  token:      string | null,
  currentValues: Record<string, string> = {},
): Promise<AttributeGroups> {
  const attrs = await loadCategoryAttributes(categoryId, domainId, token)

  /* optional_recommended = catalog_required OR currently has a value */
  const optional_recommended = attrs.optional.filter((a) => {
    if (a.tags.includes('catalog_required')) return true
    if ((currentValues[a.id] ?? '').trim() !== '') return true
    return false
  })
  const advanced = attrs.optional.filter((a) => !optional_recommended.includes(a))

  return {
    required:             attrs.required,
    conditional:          attrs.conditional,
    optional_recommended,
    advanced,
    variation:            attrs.variation,
    hidden:               attrs.hidden,
  }
}
