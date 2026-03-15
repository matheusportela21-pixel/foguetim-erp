/**
 * POST /api/ai/suggest-sac-response
 * Body: { question: string, product_title: string, product_description?: string }
 * Usa GPT-4o-mini para sugerir uma resposta cordial para perguntas de compradores ML.
 */
import { NextRequest, NextResponse } from 'next/server'
import { callOpenAI }                from '@/lib/openai'
import { checkAIRateLimit }          from '@/lib/ai-rate-limit'
import { getAuthUser }               from '@/lib/server-auth'

export interface SACResponse {
  response:   string
  confidence: number
}

const SYSTEM_PROMPT = `Você é atendente de e-commerce brasileiro, especializado em responder perguntas de compradores no Mercado Livre.

Regras:
- Resposta curta, direta e cordial (máximo 3 frases)
- Sempre termine com "Ficamos à disposição!"
- Não invente informações que não estão no produto
- Se não souber, diga que pode entrar em contato
- Linguagem informal mas profissional
- Em português brasileiro

Responda APENAS com JSON válido, sem markdown:
{"response":"...","confidence":0.9}`

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const limit = await checkAIRateLimit(user.id, 'sac_response')
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Limite diário atingido.', remaining: 0 }, { status: 429 })
  }

  const body = await req.json() as { question?: string; product_title?: string; product_description?: string }
  const question    = body.question?.trim()            ?? ''
  const productTitle = body.product_title?.trim()      ?? ''
  const productDesc  = body.product_description?.trim() ?? ''
  if (!question) return NextResponse.json({ error: 'Pergunta obrigatória' }, { status: 400 })

  const userMsg = [
    `Produto: "${productTitle}"`,
    productDesc ? `Descrição: ${productDesc.slice(0, 300)}` : '',
    `Pergunta do comprador: "${question}"`,
  ].filter(Boolean).join('\n')

  try {
    const raw    = await callOpenAI(SYSTEM_PROMPT, userMsg, 200)
    const parsed = JSON.parse(raw) as SACResponse
    return NextResponse.json({ ...parsed, remaining: limit.remaining - 1 })
  } catch {
    return NextResponse.json({ error: 'Falha ao processar. Tente novamente.' }, { status: 500 })
  }
}
