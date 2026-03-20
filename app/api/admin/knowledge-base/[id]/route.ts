/**
 * PUT    /api/admin/knowledge-base/[id]  — atualiza entrada
 * DELETE /api/admin/knowledge-base/[id]  — remove entrada
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin }              from '@/lib/admin-guard'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await req.json().catch(() => ({})) as {
    titulo?:   string
    conteudo?: string
    tags?:     string[]
    modulo?:   string
    ativo?:    boolean
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('ai_knowledge_base')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const db = supabaseAdmin()
  const { error } = await db
    .from('ai_knowledge_base')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
