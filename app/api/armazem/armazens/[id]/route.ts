/**
 * PATCH /api/armazem/armazens/[id]  — update a warehouse
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    // Guard: check ownership
    const { data: existing, error: findError } = await db
      .from('warehouses')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Armazém não encontrado' }, { status: 404 })
    }
    if ((existing as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: 'Armazém não encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if ('name'       in body) updates.name       = body.name?.trim()
    if ('code'       in body) updates.code       = body.code?.trim()
    if ('is_default' in body) updates.is_default = body.is_default
    if ('active'     in body) updates.active     = body.active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    // If setting as default, clear default from all other warehouses first
    if (updates.is_default === true) {
      const { error: clearError } = await db
        .from('warehouses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', params.id)

      if (clearError) {
        console.error('[armazem/armazens/[id] PATCH clear default]', clearError)
        return NextResponse.json({ error: 'Erro ao atualizar outros armazéns' }, { status: 500 })
      }
    }

    const { data: updated, error: updateError } = await db
      .from('warehouses')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[armazem/armazens/[id] PATCH]', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar armazém' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/armazens/[id] PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
