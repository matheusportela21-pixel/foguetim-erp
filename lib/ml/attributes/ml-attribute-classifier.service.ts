import type {
  NormalizedMlAttribute,
  MlIdentifierField,
  MlVariationField,
  MlAttributeUiSection,
} from './types'

/* ─── Identificadores ────────────────────────────────────────────────────── */

const IDENTIFIER_TYPE_MAP: Record<string, MlIdentifierField['type']> = {
  GTIN:       'GTIN',
  EAN:        'EAN',
  UPC:        'UPC',
  ISBN:       'ISBN',
  MPN:        'MPN',
  SELLER_SKU: 'SELLER_SKU',
}

const GTIN_IDS = new Set(['GTIN', 'EAN', 'UPC', 'ISBN'])

interface RawIdentifier {
  id:    string
  name?: string
  tags?: string[]
}

interface ItemAttrInput {
  id:          string
  value_name?: string | null
}

export function extractIdentifierFields(
  rawIdentifiers:      RawIdentifier[],
  currentItemAttributes: ItemAttrInput[],
  requiredIds:         Set<string>,
): MlIdentifierField[] {
  const currentMap: Record<string, string> = {}
  for (const a of currentItemAttributes) {
    currentMap[a.id] = a.value_name ?? ''
  }

  return rawIdentifiers.map((raw): MlIdentifierField => {
    const value    = currentMap[raw.id] ?? ''
    const isGtin   = GTIN_IDS.has(raw.id)
    const isValid  = isGtin ? /^\d{8,14}$/.test(value) : value.length > 0
    const tagReq   = Array.isArray(raw.tags) && raw.tags.includes('required')

    return {
      type:               IDENTIFIER_TYPE_MAP[raw.id] ?? 'SELLER_SKU',
      attribute_id:       raw.id,
      name:               raw.name ?? raw.id,
      value,
      is_required:        requiredIds.has(raw.id) || tagReq,
      is_valid:           isValid,
      not_available:      value === '' || value.toLowerCase() === 'não tenho',
      validation_message: isGtin && value && !isValid
        ? 'GTIN deve ter 8 a 14 dígitos numéricos'
        : undefined,
    } satisfies MlIdentifierField
  })
}

/* ─── Variações ─────────────────────────────────────────────────────────── */

export function extractVariationFields(
  attributes: NormalizedMlAttribute[],
): MlVariationField[] {
  return attributes
    .filter((a) => a.is_variation_attribute || a.is_allow_variations)
    .map((a): MlVariationField => ({
      attribute_id:           a.id,
      name:                   a.name,
      value_type:             a.value_type,
      allowed_values:         a.allowed_values,
      is_variation_attribute: a.is_variation_attribute,
      is_allow_variations:    a.is_allow_variations,
    } satisfies MlVariationField))
}

/* ─── Seções de UI ───────────────────────────────────────────────────────── */

function pendingCount(attrs: NormalizedMlAttribute[]): number {
  return attrs.filter(
    (a) => a.is_required && !a.current_value && !a.current_value_id,
  ).length
}

export function buildAttributeUiSections(
  attributes: NormalizedMlAttribute[],
): MlAttributeUiSection[] {
  // Excluir variações — ficam em seção própria
  const main = attributes.filter(
    (a) => !a.is_variation_attribute && !a.is_allow_variations && !a.is_hidden,
  )

  const required    = main.filter((a) => a.is_required  && !a.is_conditional)
  const conditional = main.filter((a) => a.is_conditional)
  const recommended = main.filter(
    (a) => !a.is_required && !a.is_conditional && a.is_recommended,
  )
  const optional    = main.filter(
    (a) => !a.is_required && !a.is_conditional && !a.is_recommended && !a.is_fixed,
  )
  const advanced    = main.filter((a) => a.is_fixed)

  const allSections: MlAttributeUiSection[] = [
    {
      id:                      'required',
      label:                   'Obrigatórios',
      description:             'Preencha todos para publicar',
      attributes:              required,
      is_collapsed_by_default: false,
      pending_count:           pendingCount(required),
    },
    {
      id:                      'conditional',
      label:                   'Condicionais',
      description:             'Exigidos em determinadas situações',
      attributes:              conditional,
      is_collapsed_by_default: false,
      pending_count:           pendingCount(conditional),
    },
    {
      id:                      'recommended',
      label:                   'Recomendados',
      description:             'Melhoram a visibilidade do anúncio',
      attributes:              recommended,
      is_collapsed_by_default: false,
      pending_count:           0,
    },
    {
      id:                      'optional',
      label:                   'Opcionais',
      description:             'Informações adicionais do produto',
      attributes:              optional,
      is_collapsed_by_default: true,
      pending_count:           0,
    },
    {
      id:                      'advanced',
      label:                   'Avançados',
      description:             'Campos com restrição de edição',
      attributes:              advanced,
      is_collapsed_by_default: true,
      pending_count:           0,
    },
  ]

  return allSections.filter((s) => s.attributes.length > 0)
}
