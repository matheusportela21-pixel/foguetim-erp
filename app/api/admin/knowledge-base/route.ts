/**
 * GET  /api/admin/knowledge-base   — lista entradas com filtros
 * POST /api/admin/knowledge-base   — cria nova entrada
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sp     = req.nextUrl.searchParams
  const page   = Math.max(1, Number(sp.get('page')  ?? 1))
  const limit  = Math.min(100, Number(sp.get('limit') ?? 20))
  const tipo   = sp.get('tipo')   ?? ''
  const modulo = sp.get('modulo') ?? ''
  const ativo  = sp.get('ativo')  ?? ''
  const search = sp.get('search') ?? ''

  const db     = supabaseAdmin()
  const offset = (page - 1) * limit

  let query = db
    .from('ai_knowledge_base')
    .select('id, tipo, titulo, conteudo, tags, modulo, ativo, fonte_agent_id, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (tipo)   query = query.eq('tipo', tipo)
  if (modulo) query = query.eq('modulo', modulo)
  if (ativo !== '') query = query.eq('ativo', ativo === 'true')
  if (search) query = query.or(`titulo.ilike.%${search}%,conteudo.ilike.%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    entries: data ?? [],
    total:   count ?? 0,
    page,
    limit,
    pages:   Math.ceil((count ?? 0) / limit),
  })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => ({})) as {
    tipo:     string
    titulo:   string
    conteudo: string
    tags?:    string[]
    modulo?:  string
    ativo?:   boolean
  }

  if (!body.tipo?.trim())    return NextResponse.json({ error: 'tipo é obrigatório' },    { status: 400 })
  if (!body.titulo?.trim())  return NextResponse.json({ error: 'titulo é obrigatório' },  { status: 400 })
  if (!body.conteudo?.trim()) return NextResponse.json({ error: 'conteudo é obrigatório' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('ai_knowledge_base')
    .insert({
      tipo:     body.tipo,
      titulo:   body.titulo,
      conteudo: body.conteudo,
      tags:     body.tags ?? [],
      modulo:   body.modulo ?? null,
      ativo:    body.ativo ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
