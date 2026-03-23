/**
 * GET  /api/empresa/custos  — listar custos da empresa
 * POST /api/empresa/custos  — criar novo custo
 */
import { NextRequest, NextResponse } from 'next/server'
import { requirePermission }          from '@/lib/auth/api-permissions'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('costs:view')
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const { searchParams } = new URL(req.url)
    const q           = searchParams.get('q')           || ''
    const category    = searchParams.get('category')    || ''
    const recurrence  = searchParams.get('recurrence')  || ''
    const active      = searchParams.get('active')
    const page        = Math.max(1, parseInt(searchParams.get('page')  || '1',  10))
    const limit       = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const from        = (page - 1) * limit
    const to          = from + limit - 1

    let query = db
      .from('company_costs')
      .select('*', { count: 'exact' })
      .eq('user_id', dataOwnerId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (recurrence) {
      query = query.eq('recurrence', recurrence)
    }
    if (active !== null) {
      query = query.eq('active', active === 'true')
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[empresa/custos GET]', error)
      return NextResponse.json({ error: 'Erro ao buscar custos' }, { status: 500 })
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[empresa/custos GET]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { dataOwnerId, error: authError } = await requirePermission('costs:manage')
  if (authError) return authError
  const db = supabaseAdmin()

  try {
    const body = await req.json()
    const {
      name,
      category,
      amount,
      recurrence,
      due_day,
      description,
      active = true,
      start_date,
      end_date,
    } = body

    if (!name || !category || amount === undefined || !recurrence) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, amount, recurrence' },
        { status: 400 },
      )
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json({ error: 'amount deve ser um número positivo' }, { status: 400 })
    }

    const validRecurrences = ['monthly', 'annual', 'weekly', 'one_time', 'variable']
    if (!validRecurrences.includes(recurrence)) {
      return NextResponse.json(
        { error: `recurrence inválido. Valores: ${validRecurrences.join(', ')}` },
        { status: 400 },
      )
    }

    const insertData: Record<string, unknown> = {
      user_id:    dataOwnerId,
      name,
      category,
      amount,
      recurrence,
      active,
    }
    if (due_day     !== undefined) insertData.due_day     = due_day
    if (description !== undefined) insertData.description = description
    if (start_date  !== undefined) insertData.start_date  = start_date
    if (end_date    !== undefined) insertData.end_date    = end_date

    const { data: cost, error: insertError } = await db
      .from('company_costs')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('[empresa/custos POST]', insertError)
      return NextResponse.json({ error: 'Erro ao criar custo' }, { status: 500 })
    }

    return NextResponse.json(cost, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[empresa/custos POST]', msg)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
