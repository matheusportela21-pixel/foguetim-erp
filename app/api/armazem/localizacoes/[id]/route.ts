/**
 * PATCH /api/armazem/localizacoes/[id]  — update a warehouse location
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveDataOwner } from '@/lib/auth/api-permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { dataOwnerId, error: authError } = await resolveDataOwner()
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    // Guard: location belongs to user (via warehouse ownership)
    const { data: location, error: findError } = await db
      .from('warehouse_locations')
      .select('id, warehouse_id, warehouses!inner(user_id)')
      .eq('id', params.id)
      .single()

    if (findError || !location) {
      return NextResponse.json({ error: 'Localização não encontrada' }, { status: 404 })
    }

    const warehouseData = location.warehouses as unknown as { user_id: string } | { user_id: string }[]
    const ownerId = Array.isArray(warehouseData)
      ? warehouseData[0]?.user_id
      : warehouseData?.user_id

    if (ownerId !== dataOwnerId) {
      return NextResponse.json({ error: 'Localização não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if ('label'      in body) updates.label      = body.label?.trim()
    if ('rua'        in body) updates.rua        = body.rua
    if ('corredor'   in body) updates.corredor   = body.corredor
    if ('prateleira' in body) updates.prateleira = body.prateleira
    if ('nivel'      in body) updates.nivel      = body.nivel
    if ('box'        in body) updates.box        = body.box
    if ('active'     in body) updates.active     = body.active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido para atualizar' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await db
      .from('warehouse_locations')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('[armazem/localizacoes/[id] PATCH]', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar localização' }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/localizacoes/[id] PATCH]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
