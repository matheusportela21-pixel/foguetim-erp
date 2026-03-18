/**
 * PATCH  /api/armazem/categorias/[id]  — update a category
 * DELETE /api/armazem/categorias/[id]  — delete a category
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
      .from('warehouse_categories')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
    if ((existing as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if ('name'      in body) updates.name      = body.name?.trim()
    if ('slug'      in body) updates.slug      = body.slug?.trim()
    if ('parent_id' in body) updates.parent_id = body.parent_id
    if ('active'    in body) updates.active    = body.active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    // Prevent self-referencing parent
    if (updates.parent_id === params.id) {
      return NextResponse.json({ error: 'Categoria não pode ser pai de si mesma' }, { status: 400 })
    }

    // Validate parent belongs to user if changing parent_id
    if ('parent_id' in updates && updates.parent_id !== null) {
      const { data: parent } = await db
        .from('warehouse_categories')
        .select('id')
        .eq('id', updates.parent_id as string)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!parent) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 404 })
      }
    }

    const { data: updated, error: updateError } = await db
      .from('warehouse_categories')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[armazem/categorias/[id] PATCH]', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/categorias/[id] PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    // Guard: check ownership
    const { data: existing, error: findError } = await db
      .from('warehouse_categories')
      .select('id, user_id')
      .eq('id', params.id)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }
    if ((existing as Record<string, unknown>).user_id !== user.id) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
    }

    // Check if any products use this category
    const { count, error: countError } = await db
      .from('warehouse_products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', params.id)
      .eq('user_id', user.id)

    if (countError) {
      console.error('[armazem/categorias/[id] DELETE count]', countError)
      return NextResponse.json({ error: 'Erro ao verificar produtos vinculados' }, { status: 500 })
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Categoria possui produtos vinculados' },
        { status: 409 },
      )
    }

    const { error: deleteError } = await db
      .from('warehouse_categories')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('[armazem/categorias/[id] DELETE]', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar categoria' }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/categorias/[id] DELETE]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
