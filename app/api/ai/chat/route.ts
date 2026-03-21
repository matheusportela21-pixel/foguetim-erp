/**
 * POST /api/ai/chat
 * Chat com Foguetim AI — contexto do vendedor + histórico de conversa
 */
import { NextRequest, NextResponse }              from 'next/server'
import { getAuthUser }                            from '@/lib/server-auth'
import { supabaseAdmin }                          from '@/lib/supabase-admin'
import { searchKnowledgeBase, formatKbForPrompt } from '@/lib/services/knowledge-base'
import { buildSystemPrompt }                      from '@/lib/chat/build-system-prompt'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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
  message:      string
  history:      ChatMessage[]
  moduloAtual?: string
}

async function getUserContextObj(userId: string) {
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
  const nickname    = (conn?.data as Record<string, unknown>)?.nickname as string ?? ''
  const plan        = (user?.plan as string) ?? 'explorador'
  const userName    = user?.nome_fantasia ?? user?.razao_social ?? ''

  const [{ count: totalListings }, { count: activeListings }] = await Promise.all([
    db.from('ml_listings').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    db.from('ml_listings').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
  ])

  return {
    userName,
    plan,
    planLabel:      PLAN_LABELS[plan] ?? plan,
    hasMLConnected: mlConnected,
    mlNickname:     nickname,
    totalListings:  totalListings ?? 0,
    activeListings: activeListings ?? 0,
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI não configurado' }, { status: 500 })
  }

  const body = await req.json() as Partial<ChatBody>
  const { message, history = [], moduloAtual } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message é obrigatório' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Buscar contexto do usuário e KB em paralelo
  const [userCtxObj, kbEntries] = await Promise.all([
    getUserContextObj(user.id),
    searchKnowledgeBase(message.trim(), 5).catch(() => []),
  ])

  const kbContext    = formatKbForPrompt(kbEntries)
  const systemPrompt = await buildSystemPrompt({ ...userCtxObj, moduloAtual })

  // System prompt final: base + KB da query
  const fullSystemPrompt = kbContext
    ? `${systemPrompt}\n\nINFORMAÇÕES RELEVANTES PARA ESTA PERGUNTA:\n${kbContext}`
    : systemPrompt

  // Verificar limite diário
  const plan  = userCtxObj.plan
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

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: fullSystemPrompt },
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

    void db.from('ai_usage').insert({ user_id: user.id, feature: 'chat', tokens_used: tokensUsed })

    return NextResponse.json({ message: reply, tokens_used: tokensUsed })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[ai/chat] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
