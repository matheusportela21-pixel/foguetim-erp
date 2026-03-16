import type {
  NormalizedMlAttribute,
  MlAttributeWhitelist,
  MlRejectedAttribute,
} from './types'

export function buildAttributeWhitelist(
  attributes: NormalizedMlAttribute[],
  categoryId: string,
): MlAttributeWhitelist {
  return {
    category_id: categoryId,
    allowed_ids: new Set(attributes.map((a) => a.id)),
    built_at:    new Date().toISOString(),
  }
}

export function isAttributeAllowed(
  attrId:    string,
  whitelist: MlAttributeWhitelist,
): boolean {
  return whitelist.allowed_ids.has(attrId)
}

export function rejectForeignAttributes(
  inputAttributes: Record<string, unknown>,
  whitelist:        MlAttributeWhitelist,
): {
  allowed:  Record<string, unknown>
  rejected: MlRejectedAttribute[]
} {
  const allowed:  Record<string, unknown> = {}
  const rejected: MlRejectedAttribute[]   = []

  for (const [id, value] of Object.entries(inputAttributes)) {
    if (whitelist.allowed_ids.has(id)) {
      allowed[id] = value
    } else {
      rejected.push({
        id,
        name:   id,
        reason: `Atributo não pertence à categoria ${whitelist.category_id}`,
      })
    }
  }

  return { allowed, rejected }
}
