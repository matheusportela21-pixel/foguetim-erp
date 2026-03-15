/**
 * POST /api/ai/improve-title
 * Body: { title: string, category: string }
 * Usa GPT-4o-mini para melhorar o título conforme as regras do ML Brasil.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI }                from '@/lib/openai'
import { checkAIRateLimit }          from '@/lib/ai-rate-limit'
import { getAuthUser }               from '@/lib/server-auth'

export interface ImprovedTitle {
  improved_title: string
  explanation:    string
  chars:          number
}

const SYSTEM_PROMPT = `Você é especialista em SEO para Mercado Livre Brasil.
Melhore o título do produto seguindo as regras do ML:
- Máximo 60 caracteres
- Estrutura: Produto + Marca + Modelo + Especificações
- Use palavras-chave que compradores buscam
- Sem pontuação especial, sem CAPS LOCK excessivo
- Sem palavras proibidas: frete grátis, original, garantia, oferta

Responda APENAS com JSON válido, sem markdown:
{"improved_title":"...","explanation":"...","chars":45}`

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limit = await checkAIRateLimit(user.id, 'improve_title')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Limite diário atingido.', remaining: 0 }, { status: 429 })
  }

  const body = await req.json() as { title?: string; category?: string }
  const title    = body.title?.trim()    ?? ''
  const category = body.category?.trim() ?? ''
  if (!title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })

  try {
    const userMsg = `Título atual: "${title}"${category ? `\nCategoria: ${category}` : ''}`
    const raw     = await callOpenAI(SYSTEM_PROMPT, userMsg, 200)
    const parsed  = JSON.parse(raw) as ImprovedTitle
    return NextResponse.json({ ...parsed, remaining: limit.remaining - 1 })
  } catch {
    return NextResponse.json({ error: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}
