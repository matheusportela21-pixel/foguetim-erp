/**
 * GET  /api/armazem/armazens  — list warehouses with location count
 * POST /api/armazem/armazens  — create a new warehouse
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const { data, error } = await db
      .from('warehouses')
      .select('*, locations:warehouse_locations(count)')
      .eq('user_id', dataOwnerId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('[armazem/armazens GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar armazéns' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/armazens GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const { name, code, is_default = false } = body

    if (!name) {
      return NextResponse.json({ error: 'Campo obrigatório: name' }, { status: 400 })
    }

    // If new warehouse is default, clear default from all others first
    if (is_default) {
      const { error: clearError } = await db
        .from('warehouses')
        .update({ is_default: false })
        .eq('user_id', dataOwnerId)

      if (clearError) {
        console.error('[armazem/armazens POST clear default]', clearError)
        return NextResponse.json({ error: 'Erro ao atualizar armazéns existentes' }, { status: 500 })
      }
    }

    const warehouseData: Record<string, unknown> = {
      user_id:    dataOwnerId,
      name:       name.trim(),
      is_default,
    }

    if (code !== undefined && code !== null) {
      warehouseData.code = code.trim()
    }

    const { data, error } = await db
      .from('warehouses')
      .insert(warehouseData)
      .select()
      .single()

    if (error) {
      console.error('[armazem/armazens POST]', error)
      return NextResponse.json({ error: 'Erro ao criar armazém' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/armazens POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
