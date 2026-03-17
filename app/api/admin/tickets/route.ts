/**
 * GET  /api/admin/tickets  — list tickets (admin) or own tickets (user)
 * POST /api/admin/tickets  — create ticket (any authenticated user)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser }               from '@/lib/server-auth'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status   = searchParams.get('status')
  const priority = searchParams.get('priority')
  const limit    = Number(searchParams.get('limit') ?? '50')
  const offset   = Number(searchParams.get('offset') ?? '0')

  try {
    // Check if user is admin/foguetim_support
    const { data: profile } = await supabaseAdmin()
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'foguetim_support'

    let query = supabaseAdmin()
      .from('support_tickets')
      .select(`
        *,
        user:user_id(id, name, email),
        assignee:assigned_to(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Non-admins only see their own
    if (!isAdmin) query = query.eq('user_id', user.id)
    if (status)   query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, count, error } = await query

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ tickets: [], total: 0 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tickets: data ?? [], total: count ?? 0 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as {
      title:       string
      description: string
      category?:   string
      priority?:   string
    }

    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'título e descrição são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin()
      .from('support_tickets')
      .insert({
        user_id:     user.id,
        title:       body.title.trim(),
        description: body.description.trim(),
        category:    body.category ?? 'other',
        priority:    body.priority ?? 'medium',
        status:      'open',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ticket: data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
