// Candidata de categoria retornada pela API ML
export interface CategoryCandidate {
  category_id:                string
  category_name:              string
  domain_id:                  string
  domain_name:                string
  api_score?:                 number
  path_from_root:             Array<{ id: string; name: string }>
  children_categories_count:  number
  is_leaf:                    boolean
}

// Decisão final da IA
export interface AICategorizationDecision {
  selected_category_id:   string
  selected_category_name: string
  selected_domain_id:     string
  is_leaf:                boolean
  confidence:             number
  decision_summary:       string
  alternatives:           Array<{
    category_id:   string
    category_name: string
    domain_id:     string
    is_leaf:       boolean
    confidence:    number
    reason:        string
  }>
}

// Atributo normalizado
export interface NormalizedAttribute {
  id:                    string
  name:                  string
  value_type:            string
  value_max_length?:     number
  hint?:                 string
  tags:                  Record<string, boolean>
  attribute_group_id:    string
  attribute_group_name:  string
  allowed_values:        Array<{ id: string; name: string }>
  source_endpoint:       'attributes' | 'conditional' | 'technical_specs'
  is_required:           boolean
  is_conditional:        boolean
  is_hidden:             boolean
  is_allow_variations:   boolean
  is_variation_attribute: boolean
  domain_id:             string
  category_id:           string
}

// Payload final para o front
export interface CategoryAttributePayload {
  category: {
    category_id:      string
    category_name:    string
    domain_id:        string
    is_leaf:          boolean
    confidence:       number
    breadcrumb:       string
    decision_summary?: string
  }
  required_attributes:     NormalizedAttribute[]
  conditional_attributes:  NormalizedAttribute[]
  optional_attributes:     NormalizedAttribute[]
  variation_attributes:    NormalizedAttribute[]
  hidden_attributes:       NormalizedAttribute[]
  rejected_attributes:     Array<{ id: string; name: string; reason: string }>
}

// Log de categorização
export interface CategorizationLog {
  original_title:         string
  normalized_title:       string
  candidates_received:    CategoryCandidate[]
  final_category:         string
  was_leaf:               boolean
  attributes_loaded:      number
  attributes_rejected:    number
  rejected_reasons:       string[]
  category_changed_from?: string
  ambiguity_signals:      string[]
  timestamp:              string
}
