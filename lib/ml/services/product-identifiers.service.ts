/**
 * Utilities for extracting and validating product identifiers (GTIN, SKU, MPN).
 */

interface RawAttribute {
  id:         string
  value_name: string | null
}

export interface ProductIdentifiers {
  gtin:  string   // EAN-8/12/13/14 barcode
  sku:   string   // seller_custom_field / SELLER_SKU
  mpn:   string   // manufacturer part number (ALPHANUMERIC_MODEL or MPN attr)
}

/**
 * Extracts product identifier fields from the raw item attributes array.
 */
export function extractIdentifiersFromItem(
  attributes: RawAttribute[],
  sellerCustomField?: string | null,
): ProductIdentifiers {
  const get = (ids: string[]): string =>
    attributes.find((a) => ids.includes(a.id))?.value_name ?? ''

  const gtin = get(['GTIN', 'EAN', 'BARCODE'])
  const mpn  = get(['MPN', 'ALPHANUMERIC_MODEL', 'MANUFACTURER_PART_NUMBER'])
  const sku  =
    get(['SELLER_SKU', 'SKU']) ||
    sellerCustomField?.trim() ||
    ''

  return { gtin, sku, mpn }
}

/**
 * Returns true if the given category REQUIRES a valid GTIN.
 * ML enforces GTIN for most catalog-eligible categories.
 * This is a heuristic — the definitive answer comes from the attributes API
 * (the GTIN attribute will have tag "required" if truly mandatory).
 */
export function isGtinRequiredForCategory(
  categoryId: string,
  requiredAttrIds: string[],
): boolean {
  if (requiredAttrIds.includes('GTIN') || requiredAttrIds.includes('EAN')) return true
  // Catalog-eligible prefixes (MLB + numeric = likely catalog)
  return /^MLB\d+$/.test(categoryId)
}

/**
 * Validates that a GTIN string has a valid length (8, 12, 13 or 14 digits).
 */
export function validateGtin(gtin: string): boolean {
  const digits = gtin.replace(/\D/g, '')
  return [8, 12, 13, 14].includes(digits.length)
}
