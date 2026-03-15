/**
 * POST /api/ai/suggest-category
 * Body: { title: string }
 * Usa GPT-4o-mini para sugerir categorias do ML Brasil com base no título.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI }                from '@/lib/openai'
import { checkAIRateLimit }          from '@/lib/ai-rate-limit'
import { getAuthUser }               from '@/lib/server-auth'

export interface AICategorySuggestion {
  category_id:   string
  category_name: string
  reason:        string
  confidence:    number
}

const SYSTEM_PROMPT = `Você é um especialista em categorização de produtos no Mercado Livre Brasil. Dado um título de produto, retorne as 3 categorias mais adequadas do Mercado Livre Brasil em JSON.

Categorias disponíveis (use EXATAMENTE estes IDs):
MLB1246 - Beleza e Cuidado Pessoal
MLB1430 - Calçados, Roupas e Bolsas
MLB1132 - Brinquedos e Hobbies
MLB1743 - Carros, Motos e Outros
MLB1574 - Casa, Móveis e Decoração
MLB1051 - Celulares e Telefones
MLB1500 - Construção
MLB5726 - Eletrodomésticos
MLB1000 - Eletrônicos, Áudio e Vídeo
MLB1276 - Esportes e Fitness
MLB263532 - Ferramentas
MLB1403 - Alimentos e Bebidas
MLB1384 - Bebês
MLB1039 - Câmeras e Acessórios
MLB1071 - Animais
MLB5672 - Acessórios para Veículos
MLB12404 - Indústria e Comércio
MLB1459 - Imóveis

Responda APENAS com JSON válido, sem markdown:
{"suggestions":[{"category_id":"MLB1430","category_name":"Calçados, Roupas e Bolsas","reason":"Produto de moda","confidence":0.95}]}`

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limit = await checkAIRateLimit(user.id, 'suggest_category')
  if (!limit.allowed) {
    return NextResponse.json({ error: `Limite diário atingido. Recarrega amanhã.`, remaining: 0 }, { status: 429 })
  }

  const body = await req.json() as { title?: string }
  const title = body.title?.trim() ?? ''
  if (!title || title.length < 5) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const raw = await callOpenAI(SYSTEM_PROMPT, `Título do produto: "${title}"`, 300)
    const parsed = JSON.parse(raw) as { suggestions?: AICategorySuggestion[] }
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    return NextResponse.json({ suggestions, remaining: limit.remaining - 1 })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
