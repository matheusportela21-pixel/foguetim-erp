/**
 * POST /api/ai/public-chat
 * Chat público sem autenticação — responde perguntas gerais sobre o Foguetim.
 * Usa a knowledge base sem dados do usuário.
 */
import { NextRequest, NextResponse } from 'next/server'
import { searchKnowledgeBase, formatKbForPrompt } from '@/lib/services/knowledge-base'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

const PUBLIC_SYSTEM = `Você é o Foguetim AI, assistente da Central de Ajuda do Foguetim ERP.
Você ajuda pessoas interessadas no Foguetim a entender funcionalidades, planos, integrações e como usar a plataforma.

Sobre o Foguetim:
- ERP para vendedores de marketplace brasileiro (foco no Mercado Livre)
- Funcionalidades: gestão de anúncios, pedidos, estoque multi-armazém, SAC, precificação, expedição, relatórios
- Planos: Explorador (gratuito), Comandante (R$49,90/mês), Enterprise (sob consulta)
- Integrações: Mercado Livre (ativo via API oficial), Shopee e Amazon (em breve)
- Empresa: FIO CABANA INDUSTRIA E COMERCIO DE CONFECCOES LTDA — Fortaleza, CE
- Contato: contato@foguetim.com.br

Regras:
- Seja direto, prático e amigável (tutear o usuário)
- Foque em informações públicas do produto (funcionalidades, planos, preços, como funciona)
- Para dúvidas sobre a conta específica, sugira fazer login ou contatar suporte
- Nunca invente dados ou funcionalidades que não existem
- Respostas em português brasileiro
- Máximo 3 parágrafos curtos (seja conciso)
- Use emojis com moderação`

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

interface ChatBody {
  message: string
  history: ChatMessage[]
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({
      message: 'Nosso assistente está temporariamente indisponível. Consulte nossa Central de Ajuda ou fale conosco em contato@foguetim.com.br 😊',
    })
  }

  let body: Partial<ChatBody>
  try {
    body = await req.json() as Partial<ChatBody>
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { message, history = [] } = body
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 })
  }

  const kbEntries = await searchKnowledgeBase(message.trim(), 4).catch(() => [])
  const kbContext = formatKbForPrompt(kbEntries)

  const systemPrompt = kbContext
    ? `${PUBLIC_SYSTEM}\n\nINFORMAÇÕES DA BASE DE CONHECIMENTO:\n${kbContext}`
    : PUBLIC_SYSTEM

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
        { role: 'user',   content: message.trim() },
      ],
      temperature: 0.7,
      max_tokens:  400,
    }),
  }).catch(() => null)

  if (!response?.ok) {
    return NextResponse.json({ message: 'Não consegui responder agora. Tente novamente ou entre em contato pelo contato@foguetim.com.br' })
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> }
  const reply = data.choices?.[0]?.message?.content ?? 'Não consegui responder agora.'
  return NextResponse.json({ message: reply })
}
