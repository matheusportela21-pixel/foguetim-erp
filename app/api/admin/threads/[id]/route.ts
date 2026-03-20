/**
 * GET   /api/admin/threads/[id] — detalhe completo: thread + messages com agente
 * PATCH /api/admin/threads/[id] — atualiza decisão humana / status
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export interface MessageWithAgent {
  id: string
  thread_id: string
  agent_id: string | null
  conteudo: string
  tipo: string
  tokens_usados: number | null
  created_at: string
  agent?: { nome: string; slug: string; categoria: string } | null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()

  // Fetch thread
  const { data: thread, error: threadErr } = await db
    .from('ai_agent_threads')
    .select('*')
    .eq('id', params.id)
    .single()

  if (threadErr) {
    const status = threadErr.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: threadErr.message }, { status })
  }

  // Fetch messages with agent info
  const { data: messagesRaw, error: msgErr } = await db
    .from('ai_agent_messages')
    .select(`
      id, thread_id, agent_id, conteudo, tipo, tokens_usados, created_at,
      ai_agents!ai_agent_messages_agent_id_fkey(nome, slug, categoria)
    `)
    .eq('thread_id', params.id)
    .order('created_at', { ascending: true })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  const messages: MessageWithAgent[] = (messagesRaw ?? []).map((m: Record<string, unknown>) => {
    const agentRaw = m['ai_agents'] as { nome: string; slug: string; categoria: string } | null
    return {
      id:            m.id as string,
      thread_id:     m.thread_id as string,
      agent_id:      (m.agent_id as string | null) ?? null,
      conteudo:      m.conteudo as string,
      tipo:          m.tipo as string,
      tokens_usados: (m.tokens_usados as number | null) ?? null,
      created_at:    m.created_at as string,
      agent:         agentRaw ?? null,
    }
  })

  return NextResponse.json({ thread, messages })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json() as Record<string, unknown>
  const db   = supabaseAdmin()

  const allowed: Record<string, unknown> = {}
  if (body.decisao_humana !== undefined) allowed.decisao_humana = body.decisao_humana
  if (body.status         !== undefined) allowed.status         = body.status
  if (body.decidido_em    !== undefined) allowed.decidido_em    = body.decidido_em

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
  }

  const { data, error } = await db
    .from('ai_agent_threads')
    .update(allowed)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
