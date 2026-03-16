/**
 * Listing health score calculator.
 * Returns a 0-100 score with per-issue objects that include a `section` key
 * so the UI can scroll directly to the relevant form section.
 */

export interface HealthIssue {
  id:      string
  label:   string
  ok:      boolean
  points:  number
  tip:     string
  section: string   // NAV section id (s1…s9) to scroll to when issue is clicked
}

export interface HealthResult {
  score:  number
  issues: HealthIssue[]
}

export interface HealthInput {
  title:              string
  description:        string
  pictureCount:       number
  mainPictureDims:    { w: number; h: number } | null
  gtin:               string
  mpn:                string
  requiredAttrIds:    string[]
  attrValues:         Record<string, string>   // attrId → value
  naAttrs:            Set<string>
  hasRecondicionado?:  boolean                  // condition === 'recondicionado_certificado'
}

export function calculateListingHealth(input: HealthInput): HealthResult {
  const {
    title, description, pictureCount, mainPictureDims,
    gtin, requiredAttrIds, attrValues, naAttrs,
  } = input

  const issues: HealthIssue[] = [
    {
      id:      'title_length',
      label:   'Título otimizado (40-60 chars)',
      ok:      title.length >= 40 && title.length <= 60,
      points:  15,
      tip:     `Seu título tem ${title.length} chars. Ideal: 40-60.`,
      section: 's1',
    },
    {
      id:      'has_description',
      label:   'Descrição preenchida (≥ 100 chars)',
      ok:      description.length >= 100,
      points:  20,
      tip:     'Adicione uma descrição com pelo menos 100 caracteres.',
      section: 's7',
    },
    {
      id:      'has_images',
      label:   'Ao menos 3 imagens',
      ok:      pictureCount >= 3,
      points:  20,
      tip:     'Adicione pelo menos 3 imagens do produto.',
      section: 's6',
    },
    {
      id:      'main_image_hd',
      label:   'Imagem principal ≥ 800×800px',
      ok:      mainPictureDims !== null && mainPictureDims.w >= 800 && mainPictureDims.h >= 800,
      points:  15,
      tip:     mainPictureDims
        ? `Imagem atual: ${mainPictureDims.w}×${mainPictureDims.h}px.`
        : 'Tamanho da imagem não disponível.',
      section: 's6',
    },
    {
      id:      'has_gtin',
      label:   'Código de barras (EAN/GTIN)',
      ok:      gtin.trim() !== '',
      points:  10,
      tip:     'EAN/GTIN melhora a visibilidade no catálogo ML.',
      section: 's3',
    },
    {
      id:      'required_attrs',
      label:   'Atributos obrigatórios preenchidos',
      ok:      requiredAttrIds.every(
        (id) => (attrValues[id] ?? '').trim() !== '' && !naAttrs.has(id),
      ),
      points:  20,
      tip:     'Preencha todos os atributos obrigatórios da categoria.',
      section: 's2',
    },
  ]

  const score = issues.reduce((sum, c) => sum + (c.ok ? c.points : 0), 0)
  return { score, issues }
}
