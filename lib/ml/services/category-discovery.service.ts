/**
 * Thin wrapper around categorization-engine for use in server components/routes.
 */
import {
  normalizeTitleForCategoryDiscovery,
  fetchCategoryCandidates,
  fetchCategoryTreeDetails,
  scoreCategoryCandidatesWithAI,
  resolveFinalCategory,
} from '@/lib/ml/categorization-engine'
import type { CategoryCandidate } from '@/lib/ml/types'

export interface DiscoveryResult {
  category: CategoryCandidate
  confidence: number
  decision_summary: string
}

/**
 * Full pipeline: normalize → candidates → tree details → AI decision → resolve leaf.
 * Returns null if no candidates could be found.
 */
export async function discoverFinalCategory(
  title: string,
  token: string,
): Promise<DiscoveryResult | null> {
  const normalized  = normalizeTitleForCategoryDiscovery(title)
  const raw         = await fetchCategoryCandidates(normalized, token)
  if (raw.length === 0) return null

  const candidates  = await fetchCategoryTreeDetails(raw, token)
  if (candidates.length === 0) return null

  const decision    = await scoreCategoryCandidatesWithAI(title, normalized, candidates)
  const final       = await resolveFinalCategory(decision, candidates, token)

  return {
    category:         final,
    confidence:       decision.confidence ?? 0.85,
    decision_summary: decision.decision_summary ?? '',
  }
}
