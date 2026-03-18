/**
 * GET  /api/armazem/localizacoes  — list warehouse locations
 * POST /api/armazem/localizacoes  — create a new location
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/server-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

function generateLabel(parts: {
  rua?: string | null
  corredor?: string | null
  prateleira?: string | null
  nivel?: string | null
  box?: string | null
}): string {
  const segments = [parts.rua, parts.corredor, parts.prateleira, parts.nivel, parts.box]
    .filter(Boolean) as string[]

  if (segments.length === 0) {
    return `LOC-${Date.now()}`
  }
  return segments.join('-')
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const sp           = new URL(req.url).searchParams
    const warehouse_id = sp.get('warehouse_id')

    // Fetch user's warehouse ids to scope the query
    let warehouseQuery = db
      .from('warehouses')
      .select('id')
      .eq('user_id', user.id)

    if (warehouse_id) {
      warehouseQuery = warehouseQuery.eq('id', warehouse_id)
    }

    const { data: warehouses, error: whError } = await warehouseQuery

    if (whError) {
      console.error('[armazem/localizacoes GET warehouses]', whError)
      return NextResponse.json({ error: 'Erro ao verificar armazéns' }, { status: 500 })
    }

    if (!warehouses || warehouses.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const warehouseIds = warehouses.map((w) => w.id)

    const { data, error } = await db
      .from('warehouse_locations')
      .select('*, warehouse:warehouses(id, name, code)')
      .in('warehouse_id', warehouseIds)
      .order('label', { ascending: true })

    if (error) {
      console.error('[armazem/localizacoes GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar localizações' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/localizacoes GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const { warehouse_id, label: labelInput, rua, corredor, prateleira, nivel, box } = body

    if (!warehouse_id) {
      return NextResponse.json({ error: 'Campo obrigatório: warehouse_id' }, { status: 400 })
    }

    // Guard: warehouse must belong to user
    const { data: warehouse, error: whError } = await db
      .from('warehouses')
      .select('id')
      .eq('id', warehouse_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (whError) {
      console.error('[armazem/localizacoes POST warehouse check]', whError)
      return NextResponse.json({ error: 'Erro ao verificar armazém' }, { status: 500 })
    }

    if (!warehouse) {
      return NextResponse.json({ error: 'Armazém não encontrado' }, { status: 404 })
    }

    const label = labelInput?.trim() || generateLabel({ rua, corredor, prateleira, nivel, box })

    const locationData: Record<string, unknown> = {
      warehouse_id,
      label,
    }

    if (rua       !== undefined) locationData.rua       = rua
    if (corredor  !== undefined) locationData.corredor  = corredor
    if (prateleira !== undefined) locationData.prateleira = prateleira
    if (nivel     !== undefined) locationData.nivel     = nivel
    if (box       !== undefined) locationData.box       = box

    const { data, error } = await db
      .from('warehouse_locations')
      .insert(locationData)
      .select()
      .single()

    if (error) {
      console.error('[armazem/localizacoes POST]', error)
      return NextResponse.json({ error: 'Erro ao criar localização' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[armazem/localizacoes POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
