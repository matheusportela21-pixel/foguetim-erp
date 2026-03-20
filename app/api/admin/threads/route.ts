/**
 * GET  /api/admin/threads — lista threads com filtros e paginação
 * POST /api/admin/threads — cria thread manual
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'
import { createManualThread }        from '@/lib/services/agent-communication'

export const dynamic = 'force-dynamic'

export interface ThreadListItem {
  id: string
  titulo: string
  tipo: string
  status: string
  severidade: string | null
  tags: string[] | null
  requer_decisao_humana: boolean
  created_at: string
  updated_at: string
  iniciador?: { nome: string; slug: string } | null
  message_count?: number
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp         = req.nextUrl.searchParams
  const status     = sp.get('status')     ?? ''
  const tipo       = sp.get('tipo')       ?? ''
  const severidade = sp.get('severidade') ?? ''
  const limit      = Math.min(100, Number(sp.get('limit')  ?? 20))
  const offset     = Math.max(0,   Number(sp.get('offset') ?? 0))

  const db = supabaseAdmin()

  let query = db
    .from('ai_agent_threads')
    .select(
      `id, titulo, tipo, status, severidade, tags, requer_decisao_humana,
       created_at, updated_at, iniciado_por,
       ai_agents!ai_agent_threads_iniciado_por_fkey(nome, slug)`,
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status)     query = query.eq('status', status)
  if (tipo)       query = query.eq('tipo', tipo)
  if (severidade) query = query.eq('severidade', severidade)

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count threads aguardando_decisao
  const { count: pendingCount } = await db
    .from('ai_agent_threads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'aguardando_decisao')

  const threads: ThreadListItem[] = (data ?? []).map((row: Record<string, unknown>) => {
    const agentRaw = row['ai_agents'] as { nome: string; slug: string } | null
    return {
      id:                    row.id as string,
      titulo:                row.titulo as string,
      tipo:                  row.tipo as string,
      status:                row.status as string,
      severidade:            (row.severidade as string | null) ?? null,
      tags:                  (row.tags as string[] | null) ?? null,
      requer_decisao_humana: Boolean(row.requer_decisao_humana),
      created_at:            row.created_at as string,
      updated_at:            row.updated_at as string,
      iniciador:             agentRaw ?? null,
    }
  })

  return NextResponse.json({
    threads,
    total:        count ?? 0,
    pending_count: pendingCount ?? 0,
    limit,
    offset,
  })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json() as {
    titulo:    string
    tipo:      'pedido_ajuda' | 'debate' | 'proposta' | 'melhoria'
    descricao: string
    tags?:     string
  }

  if (!body.titulo || !body.tipo || !body.descricao) {
    return NextResponse.json({ error: 'titulo, tipo e descricao são obrigatórios' }, { status: 400 })
  }

  const tags = body.tags
    ? body.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : undefined

  try {
    const result = await createManualThread({
      titulo:    body.titulo,
      tipo:      body.tipo,
      descricao: body.descricao,
      tags,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
