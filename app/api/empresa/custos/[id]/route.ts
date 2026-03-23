/**
 * PATCH  /api/empresa/custos/[id]  — atualizar custo
 * DELETE /api/empresa/custos/[id]  — remover custo
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner }          from '@/lib/auth/api-permissions'
import { supabaseAdmin }             from '@/lib/supabase-admin'

const UPDATABLE_FIELDS = [
  'name', 'category', 'amount', 'recurrence', 'due_day',
  'description', 'active', 'start_date', 'end_date',
]

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authErr2 } = await resolveDataOwner()
  if (authErr2) return authErr2
  const db = supabaseAdmin()

  const id = params.id
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  try {
    // Verificar que o custo pertence ao usuário
    const { data: existing } = await db
      .from('company_costs')
      .select('id')
      .eq('id', id)
      .eq('user_id', dataOwnerId)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Custo não encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    for (const field of UPDATABLE_FIELDS) {
      if (field in body) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error } = await db
      .from('company_costs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', dataOwnerId)
      .select()
      .single()

    if (error) {
      console.error('[empresa/custos PATCH]', error)
      return NextResponse.json({ error: 'Erro ao atualizar custo' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[empresa/custos PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authErr2 } = await resolveDataOwner()
  if (authErr2) return authErr2
  const db = supabaseAdmin()

  const id = params.id
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  try {
    const { error } = await db
      .from('company_costs')
      .delete()
      .eq('id', id)
      .eq('user_id', dataOwnerId)

    if (error) {
      console.error('[empresa/custos DELETE]', error)
      return NextResponse.json({ error: 'Erro ao excluir custo' }, { status: 500 })
    }

    return NextResponse.json({ deleted: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[empresa/custos DELETE]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
