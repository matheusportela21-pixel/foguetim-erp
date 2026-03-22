/**
 * lib/warehouse/auto-mapping.ts
 * Motor de auto-mapeamento entre produtos do armazém e anúncios de marketplaces.
 *
 * Suporta 3 níveis de match:
 *   1. SKU exato       — confiança 95%
 *   2. EAN exato       — confiança 90%
 *   3. Nome similar    — confiança 60–80% (Dice coefficient normalizado)
 */

export interface WarehouseProduct {
  id: number
  name: string
  sku: string | null
  ean: string | null
}

export interface ExternalListing {
  itemId: string
  title: string
  sku: string | null
  ean: string | null
  channel: 'mercado_livre' | 'shopee'
  price: number
  stock: number
  thumbnail: string | null
}

export interface MappingSuggestion {
  warehouseProduct: WarehouseProduct
  externalListing: ExternalListing
  matchType: 'sku_exact' | 'ean_exact' | 'name_similar'
  confidence: number  // 0–100
  alreadyMapped: boolean
}

// ─── Text helpers ──────────────────────────────────────────────────────────────

/** Normaliza texto: minúsculas, sem acentos, sem palavras comuns, sem pontuação */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\b(kit|un|ml|g|kg|pç|pc|cx|caixa|unidade|pack|combo|und|pçs|pcs)\b/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Dice coefficient sobre conjuntos de palavras (mínimo 3 caracteres) */
function diceSimilarity(a: string, b: string): number {
  const words = (s: string): Set<string> =>
    new Set(normalize(s).split(' ').filter(w => w.length >= 3))

  const wa = words(a)
  const wb = words(b)
  if (wa.size === 0 || wb.size === 0) return 0

  let overlap = 0
  Array.from(wa).forEach(w => { if (wb.has(w)) overlap++ })

  return (2 * overlap) / (wa.size + wb.size)
}

// ─── Main engine ───────────────────────────────────────────────────────────────

/**
 * Gera sugestões de mapeamento entre produtos do armazém e anúncios externos.
 *
 * Regras:
 * - SKU exato (case-insensitive) → confiança 95
 * - EAN exato                    → confiança 90
 * - Nome similar (Dice ≥ 0.6)    → confiança 60–80
 * - Já mapeados no canal são incluídos com alreadyMapped = true (para exibição)
 *
 * Retorna sugestões ordenadas por confiança (maior primeiro).
 */
export function findMappingSuggestions(
  warehouseProducts: WarehouseProduct[],
  externalListings: ExternalListing[],
  existingMappings: { productId: number; channel: string }[],
): MappingSuggestion[] {
  // Set de "productId:channel" para lookup O(1)
  const mappedSet = new Set(
    existingMappings.map(m => `${m.productId}:${m.channel}`),
  )

  const suggestions: MappingSuggestion[] = []

  for (const product of warehouseProducts) {
    for (const listing of externalListings) {
      const alreadyMapped = mappedSet.has(`${product.id}:${listing.channel}`)
      if (alreadyMapped) continue  // não sugere canal já mapeado

      let matchType: MappingSuggestion['matchType'] | null = null
      let confidence = 0

      // Nível 1: SKU exato
      if (
        product.sku &&
        listing.sku &&
        product.sku.trim().toLowerCase() === listing.sku.trim().toLowerCase()
      ) {
        matchType = 'sku_exact'
        confidence = 95
      }
      // Nível 2: EAN exato
      else if (
        product.ean &&
        listing.ean &&
        product.ean.trim() === listing.ean.trim()
      ) {
        matchType = 'ean_exact'
        confidence = 90
      }
      // Nível 3: Nome similar
      else {
        const dice = diceSimilarity(product.name, listing.title)
        if (dice >= 0.6) {
          matchType = 'name_similar'
          // mapeia 0.6–1.0 → 60–80
          confidence = Math.round(60 + (dice - 0.6) * 50)
          confidence = Math.min(80, confidence)
        }
      }

      if (matchType) {
        suggestions.push({
          warehouseProduct: product,
          externalListing: listing,
          matchType,
          confidence,
          alreadyMapped: false,
        })
      }
    }
  }

  // Ordena: maior confiança primeiro; empate → SKU > EAN > nome
  const priority: Record<string, number> = { sku_exact: 3, ean_exact: 2, name_similar: 1 }
  suggestions.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    return (priority[b.matchType] ?? 0) - (priority[a.matchType] ?? 0)
  })

  return suggestions
}
