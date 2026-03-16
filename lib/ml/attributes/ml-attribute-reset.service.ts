export interface AttributeResetResult {
  previous_category_id:  string
  new_category_id:       string
  purged_attribute_ids:  string[]
  purged_identifier_ids: string[]
  purged_variation_ids:  string[]
  timestamp:             string
}

interface AttributeState {
  attributeValues:  Record<string, unknown>
  identifierValues: Record<string, unknown>
  variationValues:  Record<string, unknown>
}

export function purgeAttributesOnCategoryChange(
  previousCategoryId: string,
  newCategoryId:       string,
  currentState:        AttributeState,
): {
  clean:  AttributeState
  result: AttributeResetResult
} {
  if (previousCategoryId === newCategoryId) {
    return {
      clean: currentState,
      result: {
        previous_category_id:  previousCategoryId,
        new_category_id:       newCategoryId,
        purged_attribute_ids:  [],
        purged_identifier_ids: [],
        purged_variation_ids:  [],
        timestamp:             new Date().toISOString(),
      },
    }
  }

  return {
    clean: {
      attributeValues:  {},
      identifierValues: {},
      variationValues:  {},
    },
    result: {
      previous_category_id:  previousCategoryId,
      new_category_id:       newCategoryId,
      purged_attribute_ids:  Object.keys(currentState.attributeValues),
      purged_identifier_ids: Object.keys(currentState.identifierValues),
      purged_variation_ids:  Object.keys(currentState.variationValues),
      timestamp:             new Date().toISOString(),
    },
  }
}
