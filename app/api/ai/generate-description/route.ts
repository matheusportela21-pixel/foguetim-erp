/**
 * POST /api/ai/generate-description
 * Body: { title: string, category: string, attributes?: Record<string, string> }
 * Usa GPT-4o-mini para gerar uma descrição otimizada para ML Brasil.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI }                from '@/lib/openai'
import { checkAIRateLimit }          from '@/lib/ai-rate-limit'
import { getAuthUser }               from '@/lib/server-auth'

export interface GeneratedDescription {
  description: string
  chars:       number
}

const SYSTEM_PROMPT = `Você é copywriter especializado em Mercado Livre Brasil.
Crie uma descrição de produto persuasiva e otimizada para SEO.

Regras OBRIGATÓRIAS do ML:
- Apenas texto simples (sem HTML, sem markdown)
- Sem mencionar: frete, prazo de entrega, garantia do vendedor
- Destacar benefícios principais
- Incluir especificações técnicas relevantes
- Mencionar o que está incluso na embalagem
- Linguagem direta e profissional
- Entre 200 e 1000 caracteres

Responda APENAS com JSON válido, sem markdown:
{"description":"...","chars":450}`

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limit = await checkAIRateLimit(user.id, 'generate_description')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Limite diário atingido.', remaining: 0 }, { status: 429 })
  }

  const body = await req.json() as { title?: string; category?: string; attributes?: Record<string, string> }
  const title      = body.title?.trim()    ?? ''
  const category   = body.category?.trim() ?? ''
  const attributes = body.attributes ?? {}
  if (!title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  const attrText = Object.entries(attributes)
    .filter(([, v]) => v && v !== 'N/A')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ')

  const userMsg = [
    `Produto: "${title}"`,
    category   ? `Categoria: ${category}` : '',
    attrText   ? `Atributos: ${attrText}` : '',
  ].filter(Boolean).join('\n')

  try {
    const raw    = await callOpenAI(SYSTEM_PROMPT, userMsg, 500)
    const parsed = JSON.parse(raw) as GeneratedDescription
    return NextResponse.json({ ...parsed, remaining: limit.remaining - 1 })
  } catch {
    return NextResponse.json({ error: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}
