/**
 * GET  /api/armazem/categorias  — list warehouse categories
 * POST /api/armazem/categorias  — create a new category
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET(_req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('inventory:view')
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const { data, error } = await db
      .from('warehouse_categories')
      .select('id, name, slug, parent_id, active, created_at, parent:warehouse_categories!parent_id(id, name)')
      .eq('user_id', dataOwnerId)
      .order('name', { ascending: true })

    if (error) {
      console.error('[armazem/categorias GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/categorias GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('inventory:manage')
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const { name, slug: slugInput, parent_id } = body

    if (!name) {
      return NextResponse.json({ error: 'Campo obrigatório: name' }, { status: 400 })
    }

    const slug = slugInput?.trim() || generateSlug(name)

    const categoryData: Record<string, unknown> = {
      user_id: dataOwnerId,
      name:    name.trim(),
      slug,
    }

    if (parent_id !== undefined && parent_id !== null) {
      // Validate parent belongs to user
      const { data: parent } = await db
        .from('warehouse_categories')
        .select('id')
        .eq('id', parent_id)
        .eq('user_id', dataOwnerId)
        .maybeSingle()

      if (!parent) {
        return NextResponse.json({ error: 'Categoria pai não encontrada' }, { status: 404 })
      }
      categoryData.parent_id = parent_id
    }

    const { data, error } = await db
      .from('warehouse_categories')
      .insert(categoryData)
      .select()
      .single()

    if (error) {
      console.error('[armazem/categorias POST]', error)
      return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/categorias POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
