/* ── Atributo normalizado da API oficial do ML ───────────────────────────── */
export interface NormalizedMlAttribute {
  id:                     string
  name:                   string
  value_type:             'string' | 'number' | 'boolean' | 'list' | 'list_multi' | 'text'
  value_max_length?:      number
  tags:                   Record<string, boolean>
  attribute_group_id:     string
  attribute_group_name:   string
  allowed_values:         Array<{ id: string; name: string }>
  source:                 'attributes' | 'conditional' | 'technical_specs'
  category_id:            string
  domain_id:              string
  hint?:                  string
  // classificação derivada das tags
  is_required:            boolean
  is_conditional:         boolean
  is_hidden:              boolean
  is_fixed:               boolean
  is_new_required:        boolean
  is_variation_attribute: boolean
  is_allow_variations:    boolean
  is_identifier:          boolean
  is_recommended:         boolean
  // valor atual do item (se editando)
  current_value?:         string
  current_value_id?:      string
}

/* ── Regra condicional ───────────────────────────────────────────────────── */
export interface MlConditionalRule {
  attribute_id:         string
  depends_on_attribute: string
  depends_on_value:     string
  becomes_required:     boolean
}

/* ── Grupo de atributos para UI ──────────────────────────────────────────── */
export interface MlAttributeGroup {
  id:         string
  name:       string
  attributes: NormalizedMlAttribute[]
}

/* ── Campo de identificação do produto ───────────────────────────────────── */
export interface MlIdentifierField {
  type:                'GTIN' | 'EAN' | 'UPC' | 'ISBN' | 'MPN' | 'SELLER_SKU'
  attribute_id:        string
  name:                string
  value:               string
  is_required:         boolean
  is_valid:            boolean
  not_available:       boolean
  validation_message?: string
}

/* ── Campo de variação ───────────────────────────────────────────────────── */
export interface MlVariationField {
  attribute_id:         string
  name:                 string
  value_type:           string
  allowed_values:       Array<{ id: string; name: string }>
  is_variation_attribute: boolean
  is_allow_variations:  boolean
}

/* ── Whitelist de atributos por categoria ────────────────────────────────── */
export interface MlAttributeWhitelist {
  category_id:  string
  allowed_ids:  Set<string>
  built_at:     string
}

/* ── Atributo rejeitado ──────────────────────────────────────────────────── */
export interface MlRejectedAttribute {
  id:               string
  name:             string
  reason:           string
  source_category?: string
}

/* ── Seção de UI de atributos ────────────────────────────────────────────── */
export interface MlAttributeUiSection {
  id:                      'required' | 'conditional' | 'recommended' | 'optional' | 'advanced'
  label:                   string
  description:             string
  attributes:              NormalizedMlAttribute[]
  is_collapsed_by_default: boolean
  pending_count:           number
}

/* ── Estado completo da engine ───────────────────────────────────────────── */
export interface MlAttributeEngineState {
  category_id:      string
  domain_id:        string
  whitelist:        MlAttributeWhitelist
  all_attributes:   NormalizedMlAttribute[]
  identifiers:      MlIdentifierField[]
  variation_fields: MlVariationField[]
  ui_sections:      MlAttributeUiSection[]
  rejected:         MlRejectedAttribute[]
  log:              MlAttributeEngineLog
}

/* ── Log da engine ───────────────────────────────────────────────────────── */
export interface MlAttributeEngineLog {
  category_id:          string
  domain_id:            string
  total_loaded:         number
  total_required:       number
  total_conditional:    number
  total_variation:      number
  total_rejected:       number
  rejected_reasons:     Record<string, string>
  previous_category_id?: string
  purged_count?:        number
  timestamp:            string
}

/* ── Sugestão de IA para preenchimento ───────────────────────────────────── */
export interface MlAttributeSuggestion {
  attribute_id:       string
  attribute_name:     string
  suggested_value:    string
  suggested_value_id?: string
  confidence:         number
  reason:             string
}
