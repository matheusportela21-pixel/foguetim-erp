import { callOpenAI } from '@/lib/openai'
import type { NormalizedMlAttribute, MlAttributeSuggestion } from './types'

const SYSTEM_PROMPT = `Você é assistente de preenchimento de ficha técnica para o Mercado Livre Brasil.

REGRAS ABSOLUTAS:
1. Você APENAS sugere valores para campos que já existem na lista fornecida
2. Você NUNCA inventa campos novos
3. Você NUNCA sugere valor para campo que não está na lista
4. Se não souber o valor com segurança, não inclua na resposta
5. Para campos com allowed_values, APENAS sugira valores da lista fornecida
6. Confidence deve ser honesto (< 0.5 se incerto)

Responda APENAS em JSON válido sem markdown:
{
  "suggestions": [
    {
      "attribute_id": "CONSISTENCY",
      "attribute_name": "Consistência",
      "suggested_value": "Gel",
      "confidence": 0.9,
      "reason": "Produto descrito como gel"
    }
  ]
}`

interface AttrForPrompt {
  id:             string
  name:           string
  type:           string
  allowed_values: string[]
}

interface RawSuggestion {
  attribute_id?:    string
  attribute_name?:  string
  suggested_value?: string
  confidence?:      number
  reason?:          string
}

interface ParsedResponse {
  suggestions?: RawSuggestion[]
}

export async function suggestAttributeValuesWithAI(
  productTitle:    string,
  categoryName:    string,
  attributes:      NormalizedMlAttribute[],
  existingValues:  Record<string, string>,
): Promise<MlAttributeSuggestion[]> {
  // Apenas atributos sem valor atual, obrigatórios ou recomendados, sem variação
  const needsSuggestion = attributes
    .filter(
      (a) =>
        !existingValues[a.id] &&
        (a.is_required || a.is_recommended) &&
        !a.is_variation_attribute,
    )
    .slice(0, 15) // máx 15 para não estourar tokens

  if (needsSuggestion.length === 0) return []

  const attrsForPrompt: AttrForPrompt[] = needsSuggestion.map((a) => ({
    id:             a.id,
    name:           a.name,
    type:           a.value_type,
    allowed_values: a.allowed_values.slice(0, 10).map((v) => v.name),
  }))

  const userMessage = `Produto: "${productTitle}"
Categoria: "${categoryName}"
Campos para preencher:
${JSON.stringify(attrsForPrompt, null, 2)}

Sugira valores apenas para os campos que você consegue inferir com segurança a partir do título do produto.`

  try {
    const raw   = await callOpenAI(SYSTEM_PROMPT, userMessage, 600)
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean) as ParsedResponse

    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []

    // Validação final: rejeitar sugestões para campos não autorizados
    const allowedIds = new Set(attributes.map((a) => a.id))

    const suggestions: MlAttributeSuggestion[] = []
    for (const s of rawSuggestions) {
      if (!s.attribute_id) continue
      if (!allowedIds.has(s.attribute_id)) {
        console.warn(`[AI Assist] Atributo não autorizado descartado: ${s.attribute_id}`)
        continue
      }
      suggestions.push({
        attribute_id:    s.attribute_id,
        attribute_name:  s.attribute_name  ?? s.attribute_id,
        suggested_value: s.suggested_value ?? '',
        confidence:      typeof s.confidence === 'number' ? s.confidence : 0,
        reason:          s.reason          ?? '',
      })
    }

    return suggestions
  } catch {
    return []
  }
}
