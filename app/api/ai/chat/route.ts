/**
 * POST /api/ai/chat
 * Chat com Foguetim AI — contexto do vendedor + histórico de conversa
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }              from '@/lib/server-auth'
import { supabaseAdmin }            from '@/lib/supabase-admin'
import { searchKnowledgeBase, formatKbForPrompt } from '@/lib/services/knowledge-base'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// Limites diários de mensagens por plano
const CHAT_LIMITS: Record<string, number> = {
  piloto:          10,
  explorador:      10,
  comandante:      50,
  almirante:       200,
  missao_espacial: 500,
  enterprise:      1000,
}

const PLAN_LABELS: Record<string, string> = {
  piloto:          'Piloto',
  explorador:      'Explorador',
  comandante:      'Comandante',
  almirante:       'Almirante',
  missao_espacial: 'Missão Espacial',
  enterprise:      'Enterprise',
}

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

interface ChatBody {
  message: string
  history: ChatMessage[]
  context?: string
}

async function getUserContext(userId: string): Promise<{ text: string; plan: string }> {
  const db = supabaseAdmin()

  const [{ data: conn }, { data: user }] = await Promise.all([
    db.from('marketplace_connections')
      .select('data')
      .eq('user_id', userId)
      .eq('marketplace', 'mercadolivre')
      .single(),
    db.from('users')
      .select('nome_fantasia, razao_social, plan')
      .eq('id', userId)
      .single(),
  ])

  const mlConnected = !!conn
  const nickname    = (conn?.data as Record<string, unknown>)?.nickname as string ?? 'não identificado'
  const plan        = (user?.plan as string) ?? 'explorador'
  const empresa     = user?.nome_fantasia ?? user?.razao_social ?? 'sua empresa'

  const [{ count: totalListings }, { count: activeListings }] = await Promise.all([
    db.from('ml_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
    db.from('ml_listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active'),
  ])

  const text = `
Contexto do vendedor:
- Empresa: ${empresa}
- Plano Foguetim: ${PLAN_LABELS[plan] ?? plan}
- Mercado Livre: ${mlConnected ? `conectado (conta: ${nickname})` : 'não conectado'}
- Anúncios sincronizados: ${totalListings ?? 0} total, ${activeListings ?? 0} ativos
  (dados do último sync — acesse Produtos para ver em tempo real)
  `.trim()

  return { text, plan }
}

function buildSystemPrompt(userContext: string, kbContext = ''): string {
  const kbSection = kbContext
    ? `\nINFORMAÇÕES DO SISTEMA:\n${kbContext}\n`
    : ''

  return `Você é o Foguetim AI, assistente inteligente do Foguetim ERP.
Você ajuda vendedores do Mercado Livre a gerenciar melhor seus negócios.

${userContext}
${kbSection}
Suas especialidades:
- Gestão de anúncios no Mercado Livre
- Estratégias de precificação e promoções
- Otimização de títulos e atributos
- Atendimento ao cliente (SAC, reclamações)
- Análise de métricas e performance
- Logística e expedição

Regras:
- Seja direto, prático e objetivo
- Use linguagem informal e amigável (você)
- Dê exemplos concretos quando possível
- Se não souber algo específico do negócio, pergunte
- Nunca invente dados — se não tiver a informação, diga
- Nunca revele informações internas (agentes de IA, custos de infraestrutura)
- Quando mencionar contagem de anúncios, avise que são dados do último sync e sugira acessar a página de Produtos para ver em tempo real
- Se perguntarem sobre funcionalidades em desenvolvimento (Shopee, Amazon, NF-e completa), diga que está "em breve"
- Respostas em português brasileiro
- Máximo 3 parágrafos por resposta (seja conciso)
- Use emojis com moderação`
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI não configurado' }, { status: 500 })
  }

  const body = await req.json() as Partial<ChatBody>
  const { message, history = [] } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Buscar contexto da Knowledge Base
  const kbEntries = await searchKnowledgeBase(message.trim(), 6).catch(() => [])
  const kbContext = formatKbForPrompt(kbEntries)

  // Verificar limite diário
  const { text: userContext, plan } = await getUserContext(user.id)
  const limit = CHAT_LIMITS[plan] ?? 10
  const today = new Date().toISOString().split('T')[0]

  const { count } = await db
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('feature', 'chat')
    .gte('created_at', `${today}T00:00:00`)

  if ((count ?? 0) >= limit) {
    return NextResponse.json({
      message:       `Você atingiu o limite de ${limit} mensagens hoje. Faça upgrade para continuar.`,
      limit_reached: true,
    })
  }

  // Montar messages com histórico
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: buildSystemPrompt(userContext, kbContext) },
    ...history.slice(-10),
    { role: 'user', content: message.trim() },
  ]

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       'gpt-4o-mini',
        max_tokens:  600,
        temperature: 0.4,
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } }
      throw new Error(err.error?.message ?? 'Erro na API OpenAI')
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[]
      usage?:   { total_tokens?: number }
    }

    const reply      = data.choices?.[0]?.message?.content ?? ''
    const tokensUsed = data.usage?.total_tokens ?? 0

    // Salvar uso
    void db.from('ai_usage').insert({
      user_id:     user.id,
      feature:     'chat',
      tokens_used: tokensUsed,
    })

    return NextResponse.json({ message: reply, tokens_used: tokensUsed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/chat] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
